import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { customerLookupQuerySchema, assistedOrderSchema } from "../../validators/index.js";
import { normalizeIndianMobile } from "../../utils/validatePhone.js";
import { generateOrderNumber } from "../../utils/orderNumber.js";
import { quantityMatchesUnit } from "../../utils/quantity.js";
import { serializeOrder } from "../../utils/serializer.js";
import { allocateInventoryFifo } from "../../utils/inventoryFifo.js";
import { createAdminNotification, notifyStockTransitions } from "../../services/push.service.js";
import { AuthenticatedRequest } from "../../types.js";
import { createHash } from "node:crypto";
import {
  computeOrderFinancials,
  allocateCustomerPaymentFIFO,
  roundCurrency,
  toPrismaDecimal,
} from "../../utils/financials.js";

const router = Router();

// GET /api/admin/customers/lookup?mobile=9876543210 (and aliases)
router.get(
  ["/customers/lookup", "/customer/lookup", "/customers/lookup-by-mobile"],
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { mobile: rawMobile } = customerLookupQuerySchema.parse(req.query);
    const cleaned = rawMobile.replace(/\D/g, "");
    const last10 = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

    if (last10.length < 10) {
      return res.json({
        found: false,
        customer: null,
        previousDue: 0,
        ordersCount: 0,
      });
    }

    const variants = [
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`,
      rawMobile.trim(),
    ];

    // Find ALL historical orders across ANY channel (Website, Customer Mobile App, Admin Assisted)
    const allOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerMobile: { in: variants } },
          { customerMobile: { endsWith: last10 } },
        ],
      },
      include: { bill: true, payments: true },
      orderBy: { createdAt: "desc" },
    });

    if (allOrders.length === 0) {
      return res.json({
        found: false,
        customer: null,
        previousDue: 0,
        ordersCount: 0,
      });
    }

    const latestOrder = allOrders[0];
    const nonCancelled = allOrders.filter((o) => o.status !== "CANCELLED");

    // Compute total previous due across all active orders
    const totalPreviousDue = roundCurrency(
      nonCancelled.reduce((sum, ord) => {
        const fin = computeOrderFinancials(ord);
        return sum + fin.due;
      }, 0)
    );

    const orderWithAddress = allOrders.find((o) => o.deliveryAddress && o.deliveryAddress.trim().length > 0);
    const resolvedAddress = orderWithAddress?.deliveryAddress || latestOrder.deliveryAddress || "";

    return res.json({
      found: true,
      customer: {
        name: latestOrder.customerName,
        customerName: latestOrder.customerName,
        mobile: last10,
        customerMobile: latestOrder.customerMobile,
        address: resolvedAddress,
        deliveryAddress: resolvedAddress,
      },
      previousDue: totalPreviousDue,
      ordersCount: allOrders.length,
    });
  })
);

// POST /api/admin/orders/assisted
router.post(
  "/orders/assisted",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = assistedOrderSchema.parse(req.body);
    const rawIdempotencyKey = (req.headers["x-idempotency-key"] as string | undefined) || body.clientRequestId;
    const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");

    const mobile = normalizeIndianMobile(body.customerMobile) || body.customerMobile.trim();

    if (rawIdempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { clientRequestId: rawIdempotencyKey },
        include: { items: true, bill: true, payments: true },
      });
      if (existing) {
        if (existing.clientRequestHash && existing.clientRequestHash !== requestHash) {
          throw new HttpError(409, "Idempotency key reused with different request payload.");
        }
        return res.json({
          order: serializeOrder(existing),
          message: "Order previously created (idempotent replay).",
          replayed: true,
        });
      }
    }

    const lineItems = body.items;
    const productIds = Array.from(new Set(lineItems.map((i) => i.productId))).sort((a, b) => a - b);

    let order: any;
    try {
      order = await prisma.$transaction(
        async (tx) => {
          // Lock product rows deterministically
          await tx.$queryRaw`
            SELECT id FROM "Product" 
            WHERE id IN (${Prisma.join(productIds)}) 
            ORDER BY id ASC 
            FOR UPDATE
          `;

          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
          });

          if (products.length !== productIds.length) {
            throw new HttpError(400, "One or more selected products no longer exist.");
          }

          let subtotal = 0;
          const orderItems = lineItems.map((li) => {
            const product = products.find((p) => p.id === li.productId);
            if (!product) throw new HttpError(400, "Invalid product in order.");
            if (!product.isActive) throw new HttpError(400, `Product "${product.name}" is currently inactive.`);
            if (!quantityMatchesUnit(li.quantity, product.unit)) {
              throw new HttpError(400, `Quantity for "${product.name}" must be a whole number for unit (${product.unit}).`);
            }
            const currentStock = Number(product.stock);
            if (currentStock < li.quantity) {
              throw new HttpError(400, `Insufficient stock for "${product.name}". Available: ${currentStock} ${product.unit}, requested: ${li.quantity}.`);
            }
            const price = roundCurrency(Number(product.price));
            const total = roundCurrency(price * li.quantity);
            subtotal = roundCurrency(subtotal + total);
            return {
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              price: toPrismaDecimal(price),
              quantity: li.quantity,
              total: toPrismaDecimal(total),
            };
          });

          const transportation = roundCurrency(body.transportation || 0);
          const discount = roundCurrency(body.discount || 0);

          if (discount > subtotal + transportation) {
            throw new HttpError(400, "Discount cannot be greater than subtotal plus transportation charge.");
          }

          const finalAmount = Math.max(0, roundCurrency(subtotal + transportation - discount));
          const paidAmount = roundCurrency(body.paidAmount || 0);

          // Decrement stock for each line item
          for (const li of lineItems) {
            await tx.product.update({
              where: { id: li.productId },
              data: { stock: { decrement: li.quantity } },
            });
          }

          // Create the Order record
          const createdOrder = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              customerName: body.customerName,
              customerMobile: mobile,
              deliveryAddress: body.deliveryAddress || null,
              notes: body.notes || (transportation > 0 ? `Transportation: ₹${transportation}` : null),
              source: "ADMIN_ASSISTED",
              subtotal: toPrismaDecimal(subtotal),
              status: "DELIVERED",
              clientRequestId: rawIdempotencyKey || null,
              clientRequestHash: requestHash,
              items: { create: orderItems },
            },
            include: { items: true },
          });

          // Allocate inventory batches (FIFO) to track exact costs and profits
          for (const item of createdOrder.items) {
            await allocateInventoryFifo(tx, {
              orderItemId: item.id,
              productId: item.productId,
              quantity: item.quantity,
              sellingPricePerUnit: item.price,
            });
          }

          // Create the Bill record
          const createdBill = await tx.bill.create({
            data: {
              orderId: createdOrder.id,
              subtotal: toPrismaDecimal(subtotal),
              discount: toPrismaDecimal(discount),
              finalAmount: toPrismaDecimal(finalAmount),
            },
          });

          // If paid amount > 0, create OrderPayment record
          let createdPayments: any[] = [];
          if (paidAmount > 0) {
            const thisOrderPaymentAmount = Math.min(paidAmount, finalAmount);
            if (thisOrderPaymentAmount > 0) {
              const payment = await tx.orderPayment.create({
                data: {
                  orderId: createdOrder.id,
                  amount: toPrismaDecimal(thisOrderPaymentAmount),
                  paymentMode: body.paymentMode,
                  paymentDate: new Date(),
                  notes: "Paid at time of order creation (Admin-Assisted)",
                },
              });
              createdPayments = [payment];
            }

            // Auto-clear old customer dues with any excess payment
            const excess = roundCurrency(paidAmount - thisOrderPaymentAmount);
            if (excess > 0) {
              const last10 = mobile.slice(-10);
              const variants = [mobile, last10, `+91${last10}`, `91${last10}`, `0${last10}`];
              
              const candidateOld = await tx.order.findMany({
                where: {
                  OR: [
                    { customerMobile: { in: variants } },
                    { customerMobile: { endsWith: last10 } },
                  ],
                  id: { not: createdOrder.id },
                  status: { not: "CANCELLED" },
                },
                select: { id: true },
                orderBy: { id: "asc" },
              });

              if (candidateOld.length > 0) {
                const oldIds = candidateOld.map((o) => o.id);
                // Concurrency lock on older orders
                await tx.$queryRaw`
                  SELECT id FROM "Order" 
                  WHERE id IN (${Prisma.join(oldIds)}) 
                  ORDER BY id ASC 
                  FOR UPDATE
                `;

                const oldOrders = await tx.order.findMany({
                  where: { id: { in: oldIds } },
                  include: { bill: true, payments: true },
                  orderBy: { createdAt: "asc" },
                });

                const oldDueList = oldOrders.map((o) => {
                  const fin = computeOrderFinancials(o);
                  return {
                    id: o.id,
                    finalAmount: fin.finalAmount,
                    paidTotal: fin.paidTotal,
                    due: fin.due,
                  };
                });

                const { allocations } = allocateCustomerPaymentFIFO(oldDueList, excess);
                for (const alloc of allocations) {
                  if (alloc.allocatedAmount <= 0) continue;
                  await tx.orderPayment.create({
                    data: {
                      orderId: alloc.orderId,
                      amount: toPrismaDecimal(alloc.allocatedAmount),
                      paymentMode: body.paymentMode,
                      paymentDate: new Date(),
                      notes: `Auto-cleared previous due from order #${createdOrder.orderNumber}`,
                    },
                  });
                }
              }
            }
          }

          return {
            ...createdOrder,
            bill: createdBill,
            payments: createdPayments,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );
    } catch (error) {
      if (rawIdempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const concurrent = await prisma.order.findUnique({
          where: { clientRequestId: rawIdempotencyKey },
          include: { items: true, bill: true, payments: true },
        });
        if (concurrent) {
          return res.json({
            order: serializeOrder(concurrent),
            message: "Order previously created (idempotent replay).",
            replayed: true,
          });
        }
      }
      throw error;
    }

    // Write audit log
    await writeAudit(req, {
      action: "CREATE_ASSISTED_ORDER",
      entity: "ORDER",
      entityId: order.id,
      details: JSON.stringify({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerMobile: order.customerMobile,
        finalAmount: order.bill?.finalAmount,
        paidAmount: body.paidAmount,
      }),
    });

    // Notify stock transitions & push alerts asynchronously
    try {
      const affected = await prisma.product.findMany({
        where: { id: { in: order.items.map((i: any) => i.productId) } },
        select: { id: true, name: true, stock: true },
      });
      const qty = new Map<number, number>(order.items.map((i: any) => [Number(i.productId), Number(i.quantity)]));
      await notifyStockTransitions(
        affected.map((p) => ({
          productId: p.id,
          name: p.name,
          next: Number(p.stock),
          previous: Number(p.stock) + (qty.get(p.id) || 0),
        })),
        `ASSISTED_ORDER:${order.id}`
      );

      const adminId = req.admin ? Number(req.admin.sub) : null;
      if (adminId && body.paidAmount && body.paidAmount > 0) {
        await createAdminNotification({
          adminId,
          type: "PAYMENT_RECEIVED",
          title: "Payment received",
          message: `₹${body.paidAmount.toFixed(2)} · ${body.paymentMode} · ${order.customerName} (Assisted Order)`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          metadata: { amount: body.paidAmount, mode: body.paymentMode },
          dedupeKey: `PAYMENT_ASSISTED:${order.id}`,
        });
      }
    } catch (e) {
      console.error("[assistedOrder] Asynchronous notification failed", e);
    }

    const serialized = serializeOrder(order);
    res.status(201).json({
      order: serialized,
      message: "Customer order placed successfully.",
    });
  })
);

export default router;
