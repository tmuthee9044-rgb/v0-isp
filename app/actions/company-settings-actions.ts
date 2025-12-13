"use server"
import { revalidatePath } from "next/cache"
import { getSql } from "@/lib/db"

export async function getCompanySettings() {
  try {
    const sql = await getSql()

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
        company_name: profile.name,
        company_trading_name: profile.trading_name,
        company_registration_number: profile.registration_number,
        company_tax_number: profile.tax_number,
        company_description: profile.description,
        company_industry: profile.industry,
        company_size: profile.company_size,
        company_founded_year: profile.founded_year?.toString(),
        primary_phone: profile.main_phone,
        primary_email: profile.main_email,
        website: profile.website,
        street_address: profile.physical_address,
        contact_city: profile.city,
        localization_language: profile.language,
        localization_currency: profile.currency,
        localization_timezone: profile.timezone,
        localization_date_format: profile.date_format,
        localization_time_format: profile.time_format,
        logo_url: profile.logo,
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
    const companyName = formData.get("company_name") as string
    const tradingName = formData.get("trading_name") as string
    const registrationNumber = formData.get("registration_number") as string
    const taxNumber = formData.get("tax_number") as string
    const description = formData.get("description") as string
    const industry = formData.get("industry") as string
    const companySize = formData.get("company_size") as string
    const foundedYear = formData.get("founded_year") as string

    // Contact information
    const primaryPhone = formData.get("primary_phone") as string
    const secondaryPhone = formData.get("secondary_phone") as string
    const primaryEmail = formData.get("primary_email") as string
    const supportEmail = formData.get("support_email") as string
    const website = formData.get("website") as string
    const socialFacebook = formData.get("social_facebook") as string
    const socialTwitter = formData.get("social_twitter") as string
    const socialLinkedin = formData.get("social_linkedin") as string

    // Address information
    const streetAddress = formData.get("street_address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const postalCode = formData.get("postal_code") as string
    const country = formData.get("country") as string

    // Localization
    const defaultLanguage = formData.get("default_language") as string
    const currency = formData.get("currency") as string
    const timezone = formData.get("timezone") as string
    const dateFormat = formData.get("date_format") as string
    const timeFormat = formData.get("time_format") as string
    const decimalSeparator = formData.get("decimal_separator") as string
    const thousandSeparator = formData.get("thousand_separator") as string
    const currencyPosition = formData.get("currency_position") as string
    const fiscalYearStart = formData.get("fiscal_year_start") as string
    const weekStart = formData.get("week_start") as string

    if (!companyName || companyName.trim() === "" || companyName === "null" || companyName === "undefined") {
      return { success: false, message: "Company name is required and cannot be empty" }
    }

    const sql = await getSql()

    // Check if company profile exists
    let existingProfile
    try {
      existingProfile = await sql`
        SELECT id FROM company_profiles 
        ORDER BY created_at DESC 
        LIMIT 1
      `
    } catch (queryError: any) {
      if (queryError.code === "42703" || queryError.code === "42P01") {
        return {
          success: false,
          message: "Database schema is missing. Please run the database setup scripts.",
        }
      }
      existingProfile = []
    }

    if (existingProfile && existingProfile.length > 0 && existingProfile[0]?.id) {
      try {
        await sql`
          UPDATE company_profiles 
          SET 
            name = ${companyName.trim()},
            trading_name = ${tradingName || null},
            registration_number = ${registrationNumber || null},
            tax_number = ${taxNumber || null},
            description = ${description || null},
            industry = ${industry || null},
            company_size = ${companySize || null},
            founded_year = ${foundedYear ? Number.parseInt(foundedYear) : null},
            physical_address = ${streetAddress || null},
            city = ${city || null},
            country = ${country || null},
            postal_code = ${postalCode || null},
            timezone = ${timezone || "Africa/Nairobi"},
            main_phone = ${primaryPhone || null},
            support_phone = ${secondaryPhone || null},
            main_email = ${primaryEmail || null},
            support_email = ${supportEmail || null},
            website = ${website || null},
            language = ${defaultLanguage || "en"},
            currency = ${currency || "KES"},
            date_format = ${dateFormat || "dd/mm/yyyy"},
            time_format = ${timeFormat || "24h"},
            decimal_separator = ${decimalSeparator || "."},
            thousand_separator = ${thousandSeparator || ","},
            currency_position = ${currencyPosition || "before"},
            fiscal_year_start = ${fiscalYearStart || "january"},
            week_start = ${weekStart || "monday"},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${existingProfile[0].id}
          RETURNING id
        `

        console.log("[v0] Company profile updated successfully")
      } catch (updateError: any) {
        console.error("[v0] Update error:", updateError)
        if (updateError.code === "42703") {
          return {
            success: false,
            message: `Missing column: ${updateError.message}. Please run database migrations.`,
          }
        }
        return {
          success: false,
          message: `Failed to update: ${updateError.message}`,
        }
      }
    } else {
      try {
        await sql`
          INSERT INTO company_profiles (
            name, trading_name, registration_number, tax_number, description, 
            industry, company_size, founded_year, physical_address, city, country, postal_code,
            timezone, main_phone, support_phone, main_email, support_email, website,
            language, currency, date_format, time_format, decimal_separator, thousand_separator,
            currency_position, fiscal_year_start, week_start, created_at, updated_at
          ) VALUES (
            ${companyName.trim()}, ${tradingName || null}, ${registrationNumber || null}, 
            ${taxNumber || null}, ${description || null}, ${industry || null}, 
            ${companySize || null}, ${foundedYear ? Number.parseInt(foundedYear) : null},
            ${streetAddress || null}, ${city || null}, ${country || null}, ${postalCode || null},
            ${timezone || "Africa/Nairobi"}, ${primaryPhone || null}, ${secondaryPhone || null},
            ${primaryEmail || null}, ${supportEmail || null}, ${website || null},
            ${defaultLanguage || "en"}, ${currency || "KES"}, ${dateFormat || "dd/mm/yyyy"},
            ${timeFormat || "24h"}, ${decimalSeparator || "."}, ${thousandSeparator || ","},
            ${currencyPosition || "before"}, ${fiscalYearStart || "january"}, 
            ${weekStart || "monday"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING id
        `

        console.log("[v0] Company profile created successfully")
      } catch (insertError: any) {
        console.error("[v0] Insert error:", insertError)
        if (insertError.code === "42703") {
          return {
            success: false,
            message: `Missing column: ${insertError.message}. Please run database migrations.`,
          }
        }
        return {
          success: false,
          message: `Failed to create: ${insertError.message}`,
        }
      }
    }

    const additionalSettings = [
      { key: "contact_state", value: state },
      { key: "contact_facebook", value: socialFacebook },
      { key: "contact_twitter", value: socialTwitter },
      { key: "contact_linkedin", value: socialLinkedin },
    ]

    for (const setting of additionalSettings) {
      if (setting.value) {
        try {
          await sql`
            INSERT INTO system_config (key, value, created_at) 
            VALUES (${setting.key}, ${setting.value}, CURRENT_TIMESTAMP)
            ON CONFLICT (key) 
            DO UPDATE SET value = ${setting.value}, created_at = CURRENT_TIMESTAMP
          `
        } catch (settingError) {
          console.error(`[v0] Error saving ${setting.key}:`, settingError)
        }
      }
    }

    revalidatePath("/settings/company")

    return { success: true, message: "Company settings updated successfully" }
  } catch (error) {
    console.error("[v0] Error updating company settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return { success: false, message: `Failed to update company settings: ${errorMessage}` }
  }
}

export async function getContentData(type: "terms" | "privacy") {
  try {
    const sql = await getSql()
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
    const sql = await getSql()
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
    const file = formData.get("file") as File
    if (!file) {
      return { success: false, message: "No file provided" }
    }

    const fileName = `${type}_${Date.now()}_${file.name}`
    const filePath = `/uploads/${fileName}`

    const sql = await getSql()
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
