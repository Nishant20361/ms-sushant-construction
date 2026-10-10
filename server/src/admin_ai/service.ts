import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { HttpError } from "../utils/httpError.js";
import { computeOrderFinancials, roundCurrency } from "../utils/financials.js";
import { interpret } from "./intent.js";
import type { AuthenticatedRequest } from "../types.js";

export interface AssistantResponse {
  message: string;
  contextToken?: string;
  options?: { label: string; value: string }[];
}
export const HELP =
  "Main customer ki udhari bata sakta hoon aur dost/accountant ke andaaz mein business growth, pricing, kharche aur planning par baat kar sakta hoon. Actual business records mein sirf udhari dekh sakta hoon; koi record change nahi kar sakta. Customer ka naam ya mobile number likhein, ya bolein: ‘Raju ka kitna udhar hai?’ Ek naam ke multiple customers honge to pehle aap select karenge. PIN/password chat mein na likhein; Khatabook unlock form use karein.";
const contextSchema = z.object({
  owner: z.string(),
  session: z.string(),
  choices: z.array(z.string()).min(2).max(20).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(800),
      }),
    )
    .max(4)
    .optional(),
});
function readContext(req: AuthenticatedRequest, token?: string) {
  try {
    if (!token) throw new Error();
    const context = contextSchema.parse(
      jwt.verify(token, config.jwtSecret, {
        algorithms: ["HS256"],
        audience: "admin-business-saathi-context",
      }),
    );
    if (
      context.owner !== req.admin!.sub ||
      context.session !== req.admin!.sessionId
    )
      throw new Error();
    return context;
  } catch {
    throw new HttpError(
      400,
      "Conversation expire ho gayi. New conversation se dobara shuru karein.",
    );
  }
}
async function assertUnlocked(req: AuthenticatedRequest) {
  const session = await prisma.adminSession.findUnique({
    where: { id: req.admin!.sessionId! },
  });
  if (
    !session ||
    session.adminId !== Number(req.admin!.sub) ||
    session.expiresAt <= new Date() ||
    !session.khatabookUnlockedUntil ||
    session.khatabookUnlockedUntil <= new Date()
  ) {
    throw new HttpError(
      403,
      "Unlock Khatabook with your PIN before accessing this data.",
    );
  }
}
export async function chat(
  req: AuthenticatedRequest,
  input: { message: string; contextToken?: string; selection?: string },
): Promise<AssistantResponse> {
  let mobile: string | undefined;
  if (input.selection) {
    await assertUnlocked(req);
    const context = readContext(req, input.contextToken);
    if (!context.choices?.includes(input.selection))
      throw new HttpError(400, "Invalid selection. Choose a listed customer.");
    mobile = input.selection;
  } else {
    const previous = input.contextToken
      ? (readContext(req, input.contextToken).history ?? [])
      : [];
    const intent = await interpret(input.message, previous);
    if (intent.unavailable) return { message: intent.reply || HELP };
    if (intent.action === "chat" && intent.reply) {
      const history = [
        ...previous,
        { role: "user" as const, text: input.message.slice(0, 800) },
        { role: "assistant" as const, text: intent.reply.slice(0, 800) },
      ].slice(-4);
      const contextToken = jwt.sign(
        { owner: req.admin!.sub, session: req.admin!.sessionId, history },
        config.jwtSecret,
        {
          algorithm: "HS256",
          audience: "admin-business-saathi-context",
          expiresIn: "30m",
        },
      );
      return { message: intent.reply, contextToken };
    }
    if (intent.action !== "dues") return { message: HELP };
    await assertUnlocked(req);
    if (!intent.customer)
      return {
        message:
          "Kis customer ki udhari chahiye? Naam ya mobile number batayein.",
      };
    const matches = await prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          { customerName: { contains: intent.customer, mode: "insensitive" } },
          { customerMobile: { contains: intent.customer } },
        ],
      },
      distinct: ["customerMobile"],
      select: {
        customerName: true,
        customerMobile: true,
        deliveryAddress: true,
      },
      orderBy: { createdAt: "desc" },
      take: 21,
    });
    if (!matches.length)
      return {
        message:
          "Is naam/number ka customer nahi mila. Naam ya poora mobile number dobara batayein.",
      };
    if (matches.length > 20)
      return {
        message: "Bahut customers mile. Poora naam ya mobile number batayein.",
      };
    if (matches.length > 1) {
      const contextToken = jwt.sign(
        {
          owner: req.admin!.sub,
          session: req.admin!.sessionId,
          choices: matches.map((m) => m.customerMobile),
        },
        config.jwtSecret,
        {
          algorithm: "HS256",
          audience: "admin-business-saathi-context",
          expiresIn: "10m",
        },
      );
      return {
        message: "Multiple customers mile. Kiski udhari chahiye?",
        contextToken,
        options: matches.map((m) => ({
          value: m.customerMobile,
          label: `${m.customerName} • …${m.customerMobile.slice(-4)}${m.deliveryAddress ? ` • ${m.deliveryAddress.slice(0, 80)}` : ""}`,
        })),
      };
    }
    mobile = matches[0].customerMobile;
  }
  const orders = await prisma.order.findMany({
    where: { customerMobile: mobile, status: { not: "CANCELLED" } },
    include: { payments: true, bill: true },
    orderBy: { createdAt: "desc" },
    take: 1001,
  });
  if (orders.length > 1000)
    throw new HttpError(
      400,
      "Customer ke 1000 se zyada orders hain. Khatabook screen use karein.",
    );
  if (!orders.length)
    return {
      message: "Customer ka active hisaab nahi mila. Dobara search karein.",
    };
  const due = roundCurrency(
    orders.reduce(
      (total, order) => total + computeOrderFinancials(order).due,
      0,
    ),
  );
  return {
    message: `${orders[0].customerName} (…${mobile!.slice(-4)}) ki total udhari: ₹${due.toFixed(2)}. Yeh abhi ke records aur recorded payments ke hisaab se hai.`,
  };
}
