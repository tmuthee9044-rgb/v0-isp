import { getSql } from "@/lib/db"
import crypto from "crypto"

/**
 * Router Secret Manager
 * Handles encrypted storage and rotation of router credentials
 */

const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const ENCRYPTION_KEY = process.env.ROUTER_SECRET_KEY || "default-key-change-in-production-32b"

interface EncryptedSecret {
  encrypted: string
  iv: string
  tag: string
}

/**
 * Encrypt a secret using AES-256-GCM
 */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))
  
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  }
}

/**
 * Decrypt a secret
 */
export function decryptSecret(encryptedData: EncryptedSecret): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))
  const iv = Buffer.from(encryptedData.iv, "hex")
  const tag = Buffer.from(encryptedData.tag, "hex")
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  const randomBytes = crypto.randomBytes(length)
  let password = ""
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length]
  }
  
  return password
}

/**
 * Rotate router credentials
 */
export async function rotateRouterCredentials(routerId: number) {
  const sql = await getSql()
  
  // Generate new password
  const newPassword = generateStrongPassword()
  const encrypted = encryptSecret(newPassword)
  
  // Store encrypted in database
  await sql`
    UPDATE routers 
    SET 
      password_encrypted = ${encrypted.encrypted},
      password_iv = ${encrypted.iv},
      password_tag = ${encrypted.tag},
      password_last_rotated = NOW(),
      updated_at = NOW()
    WHERE id = ${routerId}
  `
  
  // Log rotation
  await sql`
    INSERT INTO system_logs (
      event_type, entity_type, entity_id, description, created_at
    ) VALUES (
      'security', 'router', ${routerId}, 
      'Router credentials rotated', NOW()
    )
  `.catch(() => {})
  
  return {
    success: true,
    newPassword, // Return for immediate use, caller should apply to router
  }
}

/**
 * Get decrypted router credentials
 */
export async function getRouterCredentials(routerId: number): Promise<string | null> {
  const sql = await getSql()
  
  const result = await sql`
    SELECT password_encrypted, password_iv, password_tag
    FROM routers
    WHERE id = ${routerId}
  `
  
  if (!result[0] || !result[0].password_encrypted) {
    return null
  }
  
  return decryptSecret({
    encrypted: result[0].password_encrypted,
    iv: result[0].password_iv,
    tag: result[0].password_tag,
  })
}

/**
 * Check if credentials need rotation (older than 90 days)
 */
export async function checkCredentialRotationNeeded(routerId: number): Promise<boolean> {
  const sql = await getSql()
  
  const result = await sql`
    SELECT password_last_rotated
    FROM routers
    WHERE id = ${routerId}
  `
  
  if (!result[0] || !result[0].password_last_rotated) {
    return true // Never rotated
  }
  
  const lastRotated = new Date(result[0].password_last_rotated)
  const daysSince = (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysSince > 90
}
