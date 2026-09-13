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

function readJsonStore(): KhatabookSecurityStore {
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

function saveJsonStore(data: KhatabookSecurityStore): void {
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
 * Get active security store data directly from PostgreSQL database (SiteSetting).
 * Falls back to local JSON store and automatically migrates it to DB if present.
 */
async function getEffectiveStore(): Promise<KhatabookSecurityStore> {
  const jsonFallback = readJsonStore();
  try {
    const setting = await prisma.siteSetting.findFirst();
    if (setting) {
      // If DB has PIN hash or recovery email, use DB values
      if (setting.khatabookPinHash || setting.khatabookRecoveryEmail) {
        return {
          pinHash: setting.khatabookPinHash,
          recoveryEmail: setting.khatabookRecoveryEmail,
          resetOtpHash: setting.khatabookOtpHash,
          resetOtpExpiresAt: setting.khatabookOtpExpiresAt ? setting.khatabookOtpExpiresAt.toISOString() : null,
          updatedAt: setting.updatedAt.toISOString(),
        };
      }

      // If DB doesn't have it yet but JSON store does, sync JSON data into DB
      if (jsonFallback.pinHash || jsonFallback.recoveryEmail) {
        await prisma.siteSetting.update({
          where: { id: setting.id },
          data: {
            khatabookPinHash: jsonFallback.pinHash,
            khatabookRecoveryEmail: jsonFallback.recoveryEmail,
            khatabookOtpHash: jsonFallback.resetOtpHash,
            khatabookOtpExpiresAt: jsonFallback.resetOtpExpiresAt ? new Date(jsonFallback.resetOtpExpiresAt) : null,
          },
        });
        return jsonFallback;
      }
    }
  } catch (err) {
    console.error("[KHATABOOK SECURITY] DB read failed:", err);
    throw err;
  }

  return jsonFallback;
}

/**
 * Save security store data to both PostgreSQL database and JSON cache.
 */
async function persistStore(data: Partial<KhatabookSecurityStore>): Promise<void> {
  const existing = await getEffectiveStore();
  const merged: KhatabookSecurityStore = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  const setting = await prisma.siteSetting.findFirst();
  const updateData = {
    khatabookPinHash: merged.pinHash,
    khatabookRecoveryEmail: merged.recoveryEmail,
    khatabookOtpHash: merged.resetOtpHash,
    khatabookOtpExpiresAt: merged.resetOtpExpiresAt ? new Date(merged.resetOtpExpiresAt) : null,
  };

  if (setting) {
    await prisma.siteSetting.update({ where: { id: setting.id }, data: updateData });
  } else {
    await prisma.siteSetting.create({
      data: { ...updateData, companyName: "M/S SUSHANT CONSTRUCTION" },
    });
  }

  // Keep the legacy file only as a best-effort migration/rollback cache. The
  // database write above is authoritative and must succeed before the API does.
  saveJsonStore(merged);
}

/**
 * Get active admin Gmail address.
 */
export async function getAdminGmailAddress(): Promise<string> {
  const store = await getEffectiveStore();
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
  return config.initialAdmin.email || config.smtp.user || "";
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
  const store = await getEffectiveStore();
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
  const store = await getEffectiveStore();
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
  const updates: Partial<KhatabookSecurityStore> = {};

  if (newPin && newPin.trim()) {
    if (newPin.trim().length < 4) {
      throw new Error("PIN must be at least 4 digits");
    }
    const hash = await hashPassword(newPin.trim());
    updates.pinHash = hash;
  }

  if (recoveryEmail && recoveryEmail.trim()) {
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      throw new Error("Invalid email address format");
    }
    updates.recoveryEmail = cleanEmail;
  }

  updates.resetOtpHash = null;
  updates.resetOtpExpiresAt = null;
  await persistStore(updates);
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

  await persistStore({
    resetOtpHash: otpHash,
    resetOtpExpiresAt: expiresAt.toISOString(),
  });

  // Send email
  const sent = await sendKhatabookOtpEmail(email, otp, 15);
  if (!sent) throw new Error("Unable to send the recovery code. Check the email delivery configuration.");

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

  const store = await getEffectiveStore();
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
  await persistStore({
    pinHash: hash,
    resetOtpHash: null,
    resetOtpExpiresAt: null,
  });
}
