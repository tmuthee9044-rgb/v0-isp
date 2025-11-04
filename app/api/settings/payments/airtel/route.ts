import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        airtel_environment,
        airtel_client_id,
        airtel_merchant_code,
        airtel_merchant_name,
        airtel_callback_url,
        airtel_result_url,
        airtel_timeout_url,
        airtel_country_code,
        airtel_currency,
        airtel_min_amount,
        airtel_max_amount,
        airtel_transaction_fee,
        airtel_enable_auto_reconciliation,
        airtel_enable_notifications,
        enable_airtel
      FROM payment_gateway_configs
      WHERE gateway_type = 'airtel' OR gateway_name = 'Airtel Money'
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Airtel Money configuration not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error) {
    console.error("[v0] Error fetching Airtel settings:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Airtel Money settings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      airtel_environment,
      airtel_client_id,
      airtel_client_secret,
      airtel_api_key,
      airtel_merchant_code,
      airtel_merchant_name,
      airtel_merchant_pin,
      airtel_callback_url,
      airtel_result_url,
      airtel_timeout_url,
      airtel_country_code,
      airtel_currency,
      airtel_min_amount,
      airtel_max_amount,
      airtel_transaction_fee,
      airtel_enable_auto_reconciliation,
      airtel_enable_notifications,
      airtel_webhook_secret,
      enable_airtel,
    } = body

    // Check if Airtel config exists
    const existing = await sql`
      SELECT id FROM payment_gateway_configs
      WHERE gateway_type = 'airtel' OR gateway_name = 'Airtel Money'
      LIMIT 1
    `

    if (existing.length > 0) {
      // Update existing configuration
      await sql`
        UPDATE payment_gateway_configs
        SET 
          airtel_environment = ${airtel_environment},
          airtel_client_id = ${airtel_client_id},
          airtel_client_secret = ${airtel_client_secret},
          airtel_api_key = ${airtel_api_key},
          airtel_merchant_code = ${airtel_merchant_code},
          airtel_merchant_name = ${airtel_merchant_name},
          airtel_merchant_pin = ${airtel_merchant_pin},
          airtel_callback_url = ${airtel_callback_url},
          airtel_result_url = ${airtel_result_url},
          airtel_timeout_url = ${airtel_timeout_url},
          airtel_country_code = ${airtel_country_code},
          airtel_currency = ${airtel_currency},
          airtel_min_amount = ${airtel_min_amount},
          airtel_max_amount = ${airtel_max_amount},
          airtel_transaction_fee = ${airtel_transaction_fee},
          airtel_enable_auto_reconciliation = ${airtel_enable_auto_reconciliation},
          airtel_enable_notifications = ${airtel_enable_notifications},
          airtel_webhook_secret = ${airtel_webhook_secret},
          enable_airtel = ${enable_airtel},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id}
      `
    } else {
      // Insert new configuration
      await sql`
        INSERT INTO payment_gateway_configs (
          gateway_name,
          gateway_type,
          provider,
          airtel_environment,
          airtel_client_id,
          airtel_client_secret,
          airtel_api_key,
          airtel_merchant_code,
          airtel_merchant_name,
          airtel_merchant_pin,
          airtel_callback_url,
          airtel_result_url,
          airtel_timeout_url,
          airtel_country_code,
          airtel_currency,
          airtel_min_amount,
          airtel_max_amount,
          airtel_transaction_fee,
          airtel_enable_auto_reconciliation,
          airtel_enable_notifications,
          airtel_webhook_secret,
          enable_airtel
        ) VALUES (
          'Airtel Money',
          'airtel',
          'airtel_africa',
          ${airtel_environment},
          ${airtel_client_id},
          ${airtel_client_secret},
          ${airtel_api_key},
          ${airtel_merchant_code},
          ${airtel_merchant_name},
          ${airtel_merchant_pin},
          ${airtel_callback_url},
          ${airtel_result_url},
          ${airtel_timeout_url},
          ${airtel_country_code},
          ${airtel_currency},
          ${airtel_min_amount},
          ${airtel_max_amount},
          ${airtel_transaction_fee},
          ${airtel_enable_auto_reconciliation},
          ${airtel_enable_notifications},
          ${airtel_webhook_secret},
          ${enable_airtel}
        )
      `
    }

    return NextResponse.json({
      success: true,
      message: "Airtel Money settings saved successfully",
    })
  } catch (error) {
    console.error("[v0] Error saving Airtel settings:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save Airtel Money settings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
