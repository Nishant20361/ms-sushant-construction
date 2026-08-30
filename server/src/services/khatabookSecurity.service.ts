import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { sendKhatabookOtpEmail } from "./email.service.js";

interface KhatabookSecurityStore {
  pinHash: string | null;
  recoveryEmail: string | null;
  resetOtpHash: string | null;
  resetOtpExpiresAt: string | null;
  updatedAt: string;
}

const STORE_PATH = path.resolve(process.cwd(), "uploads", "khatabook_security.json");
const DEFAULT_PIN = "1234"; // Default initial PIN if none configured yet

function readStore(): KhatabookSecurityStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("[KHATABOOK SECURITY] Error reading security store:", e);
  }
  return {
    pinHash: null,
    recoveryEmail: null,
    resetOtpHash: null,
    resetOtpExpiresAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function saveStore(data: KhatabookSecurityStore): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[KHATABOOK SECURITY] Error writing security store:", e);
  }
}

/**
 * Get active admin Gmail address.
 */
export async function getAdminGmailAddress(): Promise<string> {
  const store = readStore();
  if (store.recoveryEmail && store.recoveryEmail.trim().length > 0) {
    return store.recoveryEmail.trim();
  }

  // Check admin table for email
  const adminWithEmail = await prisma.admin.findFirst({
    where: { email: { not: null } },
  });
  if (adminWithEmail?.email && adminWithEmail.email.trim().length > 0) {
    return adminWithEmail.email.trim();
  }

  // Check SiteSetting for email
  const siteSetting = await prisma.siteSetting.findFirst();
  if (siteSetting?.email && siteSetting.email.trim().length > 0) {
    return siteSetting.email.trim();
  }
  if (siteSetting?.businessEmail && siteSetting.businessEmail.trim().length > 0) {
    return siteSetting.businessEmail.trim();
  }

  // Fallback to configured SMTP user or admin email from env
  return config.initialAdmin.email || config.smtp.user || "admin@mssushant.com";
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "admin@***.com";
  const [user, domain] = email.split("@");
  const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***${user.slice(-1)}` : `${user}***`;
  return `${maskedUser}@${domain}`;
}

/**
 * Get status of Khatabook security.
 */
export async function getKhatabookStatus(): Promise<{
  isPinSet: boolean;
  recoveryEmail: string;
  maskedEmail: string;
  defaultPinActive: boolean;
}> {
  const store = readStore();
  const email = await getAdminGmailAddress();
  return {
    isPinSet: !!store.pinHash,
    recoveryEmail: store.recoveryEmail || email,
    maskedEmail: maskEmail(email),
    defaultPinActive: !store.pinHash,
  };
}

/**
 * Verify Khatabook PIN.
 */
export async function verifyKhatabookPin(pin: string): Promise<boolean> {
  const store = readStore();
  if (!store.pinHash) {
    // Check against default PIN 1234
    return pin === DEFAULT_PIN;
  }
  return verifyPassword(pin, store.pinHash);
}

/**
 * Update Khatabook Security (PIN and/or Recovery Email).
 */
export async function updateKhatabookSecurity(params: {
  newPin?: string;
  recoveryEmail?: string;
}): Promise<void> {
  const { newPin, recoveryEmail } = params;
  const store = readStore();

  if (newPin && newPin.trim()) {
    if (newPin.trim().length < 4) {
      throw new Error("PIN must be at least 4 digits");
    }
    const hash = await hashPassword(newPin.trim());
    store.pinHash = hash;
  }

  if (recoveryEmail && recoveryEmail.trim()) {
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      throw new Error("Invalid email address format");
    }
    store.recoveryEmail = cleanEmail;

    // Also update Admin / SiteSetting email in background for system consistency
    try {
      await prisma.siteSetting.updateMany({
        data: { email: cleanEmail },
      });
      await prisma.admin.updateMany({
        data: { email: cleanEmail },
      });
    } catch (e) {
      console.warn("[KHATABOOK SECURITY] Background email sync:", e);
    }
  }

  store.resetOtpHash = null;
  store.resetOtpExpiresAt = null;
  store.updatedAt = new Date().toISOString();
  saveStore(store);
}

/**
 * Generate and send OTP to Admin Gmail.
 */
export async function sendKhatabookResetOtp(): Promise<{
  success: boolean;
  maskedEmail: string;
  email: string;
  expiresInMinutes: number;
}> {
  const email = await getAdminGmailAddress();
  if (!email) {
    throw new Error("Admin email address is not configured");
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const store = readStore();
  store.resetOtpHash = otpHash;
  store.resetOtpExpiresAt = expiresAt.toISOString();
  saveStore(store);

  // Send email
  await sendKhatabookOtpEmail(email, otp, 15);

  return {
    success: true,
    maskedEmail: maskEmail(email),
    email,
    expiresInMinutes: 15,
  };
}

/**
 * Verify OTP and reset PIN.
 */
export async function resetKhatabookPinWithOtp(otp: string, newPin: string): Promise<void> {
  if (!otp || otp.trim().length !== 6) {
    throw new Error("Invalid 6-digit OTP code");
  }
  if (!newPin || newPin.trim().length < 4) {
    throw new Error("New PIN must be at least 4 digits");
  }

  const store = readStore();
  if (!store.resetOtpHash || !store.resetOtpExpiresAt) {
    throw new Error("No active OTP request found. Please request a new OTP.");
  }

  const expiresAt = new Date(store.resetOtpExpiresAt);
  if (Date.now() > expiresAt.getTime()) {
    throw new Error("OTP has expired. Please request a new OTP.");
  }

  const givenHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
  if (givenHash !== store.resetOtpHash) {
    throw new Error("Incorrect OTP code. Please check your Gmail.");
  }

  // OTP verified! Set new PIN
  const hash = await hashPassword(newPin.trim());
  store.pinHash = hash;
  store.resetOtpHash = null;
  store.resetOtpExpiresAt = null;
  store.updatedAt = new Date().toISOString();
  saveStore(store);
}
