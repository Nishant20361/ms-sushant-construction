import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export type DbTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CreatePurchaseBatchInput {
  productId: number;
  quantity: number;
  totalPurchaseCost?: number | Decimal | string;
  costPricePerUnit?: number | Decimal | string;
  supplierName?: string;
  invoiceNumber?: string;
  note?: string;
  purchaseDate?: Date | string;
}

export interface AllocateFifoInput {
  orderItemId: number;
  productId: number;
  quantity: number;
  sellingPricePerUnit: number | Decimal | string;
}

/**
 * Creates a new purchase batch when admin buys stock.
 * Computes exact per-unit cost price = totalPurchaseCost / quantity.
 */
export async function createPurchaseBatch(
  tx: DbTransaction,
  input: CreatePurchaseBatchInput
) {
  const qty = Number(input.quantity);
  if (qty <= 0 || !Number.isFinite(qty)) {
    throw new Error("Quantity must be a positive number.");
  }

  let totalCostDec: Decimal;
  let unitCostDec: Decimal;

  if (input.totalPurchaseCost !== undefined && input.totalPurchaseCost !== null) {
    totalCostDec = new Decimal(String(input.totalPurchaseCost));
    if (totalCostDec.lt(0)) throw new Error("Total purchase cost cannot be negative.");
    unitCostDec = totalCostDec.div(qty).toDecimalPlaces(2);
  } else if (input.costPricePerUnit !== undefined && input.costPricePerUnit !== null) {
    unitCostDec = new Decimal(String(input.costPricePerUnit));
    if (unitCostDec.lt(0)) throw new Error("Cost price per unit cannot be negative.");
    totalCostDec = unitCostDec.mul(qty).toDecimalPlaces(2);
  } else {
    throw new Error("Either totalPurchaseCost or costPricePerUnit must be provided.");
  }

  const pDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();

  return tx.productPurchaseBatch.create({
    data: {
      productId: input.productId,
      supplierName: input.supplierName?.trim() || null,
      invoiceNumber: input.invoiceNumber?.trim() || null,
      note: input.note?.trim() || null,
      initialQuantity: qty,
      remainingQuantity: qty,
      costPricePerUnit: unitCostDec,
      totalPurchaseCost: totalCostDec,
      purchaseDate: pDate,
    },
  });
}

/**
 * Allocates sold items against oldest available purchase batches (FIFO).
 * Computes exact cost and gross profit per allocation slice.
 */
export async function allocateInventoryFifo(
  tx: DbTransaction,
  input: AllocateFifoInput
) {
  const neededQty = Number(input.quantity);
  if (neededQty <= 0) return [];

  const sellingPriceDec = new Decimal(String(input.sellingPricePerUnit));

  // Find all batches with remaining stock ordered by oldest purchase date first (FIFO)
  const batches = await tx.productPurchaseBatch.findMany({
    where: {
      productId: input.productId,
      remainingQuantity: { gt: 0 },
    },
    orderBy: [{ purchaseDate: "asc" }, { id: "asc" }],
  });

  let remainingToAllocate = neededQty;
  const createdAllocations = [];

  for (const batch of batches) {
    if (remainingToAllocate <= 0) break;

    const availableInBatch = Number(batch.remainingQuantity);
    if (availableInBatch <= 0) continue;

    const takeQty = Math.min(remainingToAllocate, availableInBatch);
    const unitCostDec = new Decimal(batch.costPricePerUnit);
    const totalCostDec = unitCostDec.mul(takeQty).toDecimalPlaces(2);
    const totalRevenueDec = sellingPriceDec.mul(takeQty).toDecimalPlaces(2);
    const grossProfitDec = totalRevenueDec.sub(totalCostDec);

    // Decrement batch remaining quantity
    await tx.productPurchaseBatch.update({
      where: { id: batch.id },
      data: {
        remainingQuantity: {
          decrement: takeQty,
        },
      },
    });

    // Record allocation
    const alloc = await tx.orderItemCostAllocation.create({
      data: {
        orderItemId: input.orderItemId,
        batchId: batch.id,
        quantity: takeQty,
        costPricePerUnit: unitCostDec,
        sellingPricePerUnit: sellingPriceDec,
        totalCost: totalCostDec,
        totalRevenue: totalRevenueDec,
        grossProfit: grossProfitDec,
      },
    });

    createdAllocations.push(alloc);
    remainingToAllocate = Number((remainingToAllocate - takeQty).toFixed(4));
  }

  // If there is still quantity remaining (e.g. legacy stock before batch system was introduced)
  if (remainingToAllocate > 0) {
    const fallbackUnitCost = new Decimal(0);
    const totalCostDec = fallbackUnitCost.mul(remainingToAllocate).toDecimalPlaces(2);
    const totalRevenueDec = sellingPriceDec.mul(remainingToAllocate).toDecimalPlaces(2);
    const grossProfitDec = totalRevenueDec.sub(totalCostDec);

    const alloc = await tx.orderItemCostAllocation.create({
      data: {
        orderItemId: input.orderItemId,
        batchId: null,
        quantity: remainingToAllocate,
        costPricePerUnit: fallbackUnitCost,
        sellingPricePerUnit: sellingPriceDec,
        totalCost: totalCostDec,
        totalRevenue: totalRevenueDec,
        grossProfit: grossProfitDec,
      },
    });
    createdAllocations.push(alloc);
  }

  return createdAllocations;
}

/**
 * Restores inventory allocations back to purchase batches when an order is cancelled.
 */
export async function restoreInventoryFifo(
  tx: DbTransaction,
  orderItemId: number
) {
  const allocations = await tx.orderItemCostAllocation.findMany({
    where: { orderItemId },
  });

  for (const alloc of allocations) {
    if (alloc.batchId) {
      await tx.productPurchaseBatch.update({
        where: { id: alloc.batchId },
        data: {
          remainingQuantity: {
            increment: alloc.quantity,
          },
        },
      }).catch(() => {
        // Ignore if batch was deleted
      });
    }
  }

  await tx.orderItemCostAllocation.deleteMany({
    where: { orderItemId },
  });
}

/**
 * Comprehensive Profit & Loss Analytics Engine for Khatabook.
 */
export async function getProfitAnalytics(prisma: PrismaClient) {
  const now = new Date();

  // Start of today (IST / local boundary)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 1. Fetch non-cancelled orders with their items, cost allocations, and bills
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
    },
    include: {
      bill: true,
      items: {
        include: {
          costAllocations: true,
          product: {
            select: { id: true, name: true, unit: true, category: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Profit buckets
  let dailyGross = new Decimal(0);
  let dailyDiscount = new Decimal(0);
  let dailyOrdersCount = 0;

  let monthlyGross = new Decimal(0);
  let monthlyDiscount = new Decimal(0);
  let monthlyOrdersCount = 0;

  let allTimeGross = new Decimal(0);
  let allTimeDiscount = new Decimal(0);
  let allTimeOrdersCount = 0;

  // Product-wise aggregation
  const productMap = new Map<
    number,
    {
      productId: number;
      productName: string;
      categoryName: string;
      unit: string;
      unitsSold: number;
      totalRevenue: Decimal;
      totalCost: Decimal;
      grossProfit: Decimal;
    }
  >();

  for (const o of orders) {
    const createdAt = new Date(o.createdAt);
    const isToday = createdAt >= todayStart && createdAt <= todayEnd;
    const isThisMonth = createdAt >= monthStart && createdAt <= monthEnd;

    let orderGross = new Decimal(0);
    const orderDiscount = o.bill ? new Decimal(o.bill.discount) : new Decimal(0);

    for (const item of o.items) {
      let itemGross = new Decimal(0);
      let itemCost = new Decimal(0);
      let itemRevenue = new Decimal(0);
      let itemQty = item.quantity;

      if (item.costAllocations && item.costAllocations.length > 0) {
        for (const alloc of item.costAllocations) {
          itemGross = itemGross.add(new Decimal(alloc.grossProfit));
          itemCost = itemCost.add(new Decimal(alloc.totalCost));
          itemRevenue = itemRevenue.add(new Decimal(alloc.totalRevenue));
        }
      } else {
        // Fallback for historic orders without allocations
        itemRevenue = new Decimal(item.total);
        itemCost = new Decimal(0);
        itemGross = itemRevenue.sub(itemCost);
      }

      orderGross = orderGross.add(itemGross);

      // Product-wise map
      const prodId = item.productId;
      if (!productMap.has(prodId)) {
        productMap.set(prodId, {
          productId: prodId,
          productName: item.productName || item.product?.name || `Product #${prodId}`,
          categoryName: item.product?.category?.name || "General",
          unit: item.unit || item.product?.unit || "unit",
          unitsSold: 0,
          totalRevenue: new Decimal(0),
          totalCost: new Decimal(0),
          grossProfit: new Decimal(0),
        });
      }

      const pEntry = productMap.get(prodId)!;
      pEntry.unitsSold += itemQty;
      pEntry.totalRevenue = pEntry.totalRevenue.add(itemRevenue);
      pEntry.totalCost = pEntry.totalCost.add(itemCost);
      pEntry.grossProfit = pEntry.grossProfit.add(itemGross);
    }

    // Accumulate
    if (isToday) {
      dailyGross = dailyGross.add(orderGross);
      dailyDiscount = dailyDiscount.add(orderDiscount);
      dailyOrdersCount++;
    }
    if (isThisMonth) {
      monthlyGross = monthlyGross.add(orderGross);
      monthlyDiscount = monthlyDiscount.add(orderDiscount);
      monthlyOrdersCount++;
    }
    allTimeGross = allTimeGross.add(orderGross);
    allTimeDiscount = allTimeDiscount.add(orderDiscount);
    allTimeOrdersCount++;
  }

  const dailyNet = dailyGross.sub(dailyDiscount);
  const monthlyNet = monthlyGross.sub(monthlyDiscount);
  const allTimeNet = allTimeGross.sub(allTimeDiscount);

  // 2. Compute live stock valuation from active purchase batches
  const activeBatches = await prisma.productPurchaseBatch.findMany({
    where: { remainingQuantity: { gt: 0 } },
    include: {
      product: { select: { id: true, name: true, unit: true, price: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });

  let totalStockValuation = new Decimal(0);
  for (const b of activeBatches) {
    const val = new Decimal(b.costPricePerUnit).mul(b.remainingQuantity);
    totalStockValuation = totalStockValuation.add(val);
  }

  // 3. Fetch recent purchase batches
  const recentBatches = await prisma.productPurchaseBatch.findMany({
    take: 20,
    orderBy: { purchaseDate: "desc" },
    include: {
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  const productProfits = Array.from(productMap.values()).map((p) => {
    const netProfit = p.grossProfit;
    const marginPercent = p.totalRevenue.gt(0)
      ? netProfit.div(p.totalRevenue).mul(100).toNumber()
      : 0;

    return {
      productId: p.productId,
      productName: p.productName,
      categoryName: p.categoryName,
      unit: p.unit,
      unitsSold: Number(p.unitsSold.toFixed(2)),
      totalRevenue: Number(p.totalRevenue.toFixed(2)),
      totalCost: Number(p.totalCost.toFixed(2)),
      grossProfit: Number(p.grossProfit.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(1)),
    };
  });

  productProfits.sort((a, b) => b.netProfit - a.netProfit);

  return {
    dailyProfit: {
      grossProfit: Number(dailyGross.toFixed(2)),
      discountGiven: Number(dailyDiscount.toFixed(2)),
      netProfit: Number(dailyNet.toFixed(2)),
      ordersCount: dailyOrdersCount,
    },
    monthlyProfit: {
      grossProfit: Number(monthlyGross.toFixed(2)),
      discountGiven: Number(monthlyDiscount.toFixed(2)),
      netProfit: Number(monthlyNet.toFixed(2)),
      ordersCount: monthlyOrdersCount,
    },
    allTimeProfit: {
      grossProfit: Number(allTimeGross.toFixed(2)),
      discountGiven: Number(allTimeDiscount.toFixed(2)),
      netProfit: Number(allTimeNet.toFixed(2)),
      ordersCount: allTimeOrdersCount,
    },
    currentStockValuation: Number(totalStockValuation.toFixed(2)),
    activeBatchesCount: activeBatches.length,
    productProfits,
    recentBatches: recentBatches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      productId: b.productId,
      productName: b.product?.name || `Product #${b.productId}`,
      unit: b.product?.unit || "unit",
      supplierName: b.supplierName,
      invoiceNumber: b.invoiceNumber,
      note: b.note,
      initialQuantity: b.initialQuantity,
      remainingQuantity: b.remainingQuantity,
      costPricePerUnit: Number(b.costPricePerUnit),
      totalPurchaseCost: Number(b.totalPurchaseCost),
      purchaseDate: b.purchaseDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
  };
}
