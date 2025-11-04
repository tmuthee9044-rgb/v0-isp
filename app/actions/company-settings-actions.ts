"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function getCompanySettings() {
  try {
    console.log("[v0] Fetching company settings from database")

    const companyProfile = await sql`
      SELECT * FROM company_profiles 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    // Also get system config settings for additional fields
    const systemSettings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'company_%' OR key LIKE 'branding_%' OR key LIKE 'contact_%' OR key LIKE 'localization_%'
      ORDER BY key
    `

    console.log(`[v0] Found company profile and ${systemSettings.length} system settings`)

    // Convert system settings array to object
    const settingsObject: Record<string, any> = {}
    systemSettings.forEach((setting: any) => {
      try {
        settingsObject[setting.key] = JSON.parse(setting.value)
      } catch {
        settingsObject[setting.key] = setting.value
      }
    })

    if (companyProfile.length > 0) {
      const profile = companyProfile[0]
      return {
        // Company profile fields
        company_name: profile.company_name,
        company_trading_name: profile.company_name,
        company_registration_number: profile.registration_number,
        company_tax_number: profile.tax_number,
        company_description: profile.description,
        company_industry: profile.industry,
        company_founded_year: profile.established_date
          ? new Date(profile.established_date).getFullYear().toString()
          : null,
        primary_phone: profile.phone,
        primary_email: profile.email,
        website: profile.website,
        street_address: profile.address,
        logo_url: profile.logo_url,
        localization_language: profile.default_language,
        localization_currency: profile.currency,
        localization_timezone: profile.timezone,
        localization_date_format: profile.date_format,
        localization_time_format: profile.time_format,
        localization_number_format: profile.number_format,
        localization_week_start: profile.week_start,
        company_prefix: profile.company_prefix,
        tax_system: profile.tax_system,
        tax_rate: profile.tax_rate,
        // System config settings
        ...settingsObject,
      }
    }

    return settingsObject
  } catch (error) {
    console.error("[v0] Error fetching company settings:", error)
    return {}
  }
}

export async function updateCompanySettings(formData: FormData) {
  try {
    console.log("[v0] Form data received:", Object.fromEntries(formData.entries()))

    const companyName = formData.get("company_name") as string
    const registrationNumber = formData.get("registration_number") as string
    const taxNumber = formData.get("tax_number") as string
    const description = formData.get("description") as string
    const industry = formData.get("industry") as string
    const foundedYear = formData.get("founded_year") as string
    const phone = formData.get("primary_phone") as string
    const email = formData.get("primary_email") as string
    const website = formData.get("website") as string
    const address = formData.get("street_address") as string

    const defaultLanguage = formData.get("default_language") as string
    const currency = formData.get("currency") as string
    const timezone = formData.get("timezone") as string
    const dateFormat = formData.get("date_format") as string
    const timeFormat = formData.get("time_format") as string
    const numberFormat = formData.get("number_format") as string
    const weekStart = formData.get("week_start") as string
    const companyPrefix = formData.get("company_prefix") as string
    const taxSystem = formData.get("tax_system") as string
    const taxRate = formData.get("tax_rate") as string

    console.log("[v0] Company name value:", companyName, "Type:", typeof companyName)

    if (!companyName || companyName.trim() === "" || companyName === "null" || companyName === "undefined") {
      console.log("[v0] Company name validation failed")
      return { success: false, message: "Company name is required and cannot be empty" }
    }

    // Check if company profile exists
    const existingProfile = await sql`
      SELECT id FROM company_profiles 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    console.log("[v0] Existing profile found:", existingProfile.length > 0)

    if (existingProfile.length > 0) {
      console.log("[v0] Updating existing profile with company name:", companyName.trim())

      try {
        const updateResult = await sql`
          UPDATE company_profiles 
          SET 
            company_name = ${companyName.trim()},
            registration_number = ${registrationNumber || null},
            tax_number = ${taxNumber || null},
            description = ${description || null},
            industry = ${industry || null},
            established_date = ${foundedYear ? `${foundedYear}-01-01` : null},
            phone = ${phone || null},
            email = ${email || null},
            website = ${website || null},
            address = ${address || null},
            default_language = ${defaultLanguage || "en"},
            currency = ${currency || "kes"},
            timezone = ${timezone || "eat"},
            date_format = ${dateFormat || "dd/mm/yyyy"},
            time_format = ${timeFormat || "24h"},
            number_format = ${numberFormat || "comma"},
            week_start = ${weekStart || "monday"},
            company_prefix = ${companyPrefix || null},
            tax_system = ${taxSystem || "vat"},
            tax_rate = ${taxRate ? Number(taxRate) : 16},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${existingProfile[0].id}
          RETURNING id
        `
        console.log("[v0] Profile updated successfully, ID:", updateResult[0]?.id)
      } catch (updateError) {
        console.error("[v0] Error updating profile:", updateError)
        throw updateError
      }
    } else {
      console.log("[v0] Creating new profile with company name:", companyName.trim())

      try {
        const insertResult = await sql`
          INSERT INTO company_profiles (
            company_name, registration_number, tax_number, description, 
            industry, established_date, phone, email, website, address,
            default_language, currency, timezone, date_format, time_format,
            number_format, week_start, company_prefix, tax_system, tax_rate,
            created_at, updated_at
          ) VALUES (
            ${companyName.trim()}, ${registrationNumber || null}, ${taxNumber || null}, ${description || null},
            ${industry || null}, ${foundedYear ? `${foundedYear}-01-01` : null}, 
            ${phone || null}, ${email || null}, ${website || null}, ${address || null},
            ${defaultLanguage || "en"}, ${currency || "kes"}, ${timezone || "eat"},
            ${dateFormat || "dd/mm/yyyy"}, ${timeFormat || "24h"}, ${numberFormat || "comma"},
            ${weekStart || "monday"}, ${companyPrefix || null}, ${taxSystem || "vat"}, ${taxRate ? Number(taxRate) : 16},
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING id
        `
        console.log("[v0] Profile created successfully, ID:", insertResult[0]?.id)
      } catch (insertError) {
        console.error("[v0] Error creating profile:", insertError)
        throw insertError
      }
    }

    console.log("[v0] Updating system_config settings...")

    const settings = [
      // Basic Info (additional fields not in company_profiles)
      { key: "company_trading_name", value: formData.get("trading_name") as string },
      { key: "company_size", value: formData.get("company_size") as string },

      // Branding
      { key: "branding_primary_color", value: formData.get("primary_color") as string },
      { key: "branding_secondary_color", value: formData.get("secondary_color") as string },
      { key: "branding_accent_color", value: formData.get("accent_color") as string },

      // Contact Info (additional fields)
      { key: "contact_secondary_phone", value: formData.get("secondary_phone") as string },
      { key: "contact_support_email", value: formData.get("support_email") as string },
      { key: "contact_facebook", value: formData.get("social_facebook") as string },
      { key: "contact_twitter", value: formData.get("social_twitter") as string },
      { key: "contact_linkedin", value: formData.get("social_linkedin") as string },
      { key: "contact_city", value: formData.get("city") as string },
      { key: "contact_state", value: formData.get("state") as string },
      { key: "contact_postal_code", value: formData.get("postal_code") as string },
      { key: "contact_country", value: formData.get("country") as string },
    ]

    // Update or insert each setting
    for (const setting of settings) {
      if (setting.value) {
        try {
          await sql`
            INSERT INTO system_config (key, value, created_at) 
            VALUES (${setting.key}, ${setting.value}, CURRENT_TIMESTAMP)
            ON CONFLICT (key) 
            DO UPDATE SET value = ${setting.value}, created_at = CURRENT_TIMESTAMP
          `
        } catch (settingError) {
          console.error(`[v0] Error updating setting ${setting.key}:`, settingError)
          // Continue with other settings even if one fails
        }
      }
    }

    console.log("[v0] All settings updated successfully, revalidating path...")
    revalidatePath("/settings/company")
    console.log("[v0] Path revalidated, returning success response")

    return { success: true, message: "Company settings updated successfully" }
  } catch (error) {
    console.error("[v0] Error updating company settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return { success: false, message: `Failed to update company settings: ${errorMessage}` }
  }
}

export async function getContentData(type: "terms" | "privacy") {
  try {
    const result = await sql`
      SELECT value FROM system_config 
      WHERE key = ${`content_${type}`}
    `

    if (result.length > 0) {
      return JSON.parse(result[0].value)
    }

    return null
  } catch (error) {
    console.error(`Error fetching ${type} content:`, error)
    return null
  }
}

export async function updateContentData(type: "terms" | "privacy", content: any) {
  try {
    const contentWithTimestamp = {
      ...content,
      lastUpdated: new Date().toLocaleDateString(),
    }

    await sql`
      INSERT INTO system_config (key, value, created_at) 
      VALUES (${`content_${type}`}, ${JSON.stringify(contentWithTimestamp)}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify(contentWithTimestamp)}, created_at = CURRENT_TIMESTAMP
    `

    revalidatePath("/settings/company")
    return {
      success: true,
      message: `${type === "terms" ? "Terms of Service" : "Privacy Policy"} updated successfully`,
    }
  } catch (error) {
    console.error(`Error updating ${type} content:`, error)
    return { success: false, message: `Failed to update ${type === "terms" ? "Terms of Service" : "Privacy Policy"}` }
  }
}

export async function uploadFile(formData: FormData, type: "logo" | "favicon" | "template") {
  try {
    // This would integrate with your file storage solution (e.g., Vercel Blob, AWS S3)
    // For now, we'll simulate the upload and store the file path in system_config

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, message: "No file provided" }
    }

    // Simulate file upload - in production, upload to your storage service
    const fileName = `${type}_${Date.now()}_${file.name}`
    const filePath = `/uploads/${fileName}`

    // Store file path in system_config
    await sql`
      INSERT INTO system_config (key, value, created_at) 
      VALUES (${`file_${type}`}, ${filePath}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${filePath}, created_at = CURRENT_TIMESTAMP
    `

    revalidatePath("/settings/company")
    return { success: true, message: `${type} uploaded successfully`, filePath }
  } catch (error) {
    console.error(`Error uploading ${type}:`, error)
    return { success: false, message: `Failed to upload ${type}` }
  }
}
