import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log MPESA callback received
    await ActivityLogger.logMpesaActivity(
      "MPESA callback received",
      body.TransactionID || body.CheckoutRequestID,
      body,
      "INFO",
    )

    // Process different types of MPESA callbacks
    if (body.Body?.stkCallback) {
      // STK Push callback
      const callback = body.Body.stkCallback
      const resultCode = callback.ResultCode
      const resultDesc = callback.ResultDesc
      const checkoutRequestID = callback.CheckoutRequestID

      if (resultCode === 0) {
        // Successful payment
        const callbackMetadata = callback.CallbackMetadata?.Item || []
        const amount = callbackMetadata.find((item: any) => item.Name === "Amount")?.Value
        const mpesaReceiptNumber = callbackMetadata.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value
        const transactionDate = callbackMetadata.find((item: any) => item.Name === "TransactionDate")?.Value
        const phoneNumber = callbackMetadata.find((item: any) => item.Name === "PhoneNumber")?.Value

        // Save successful transaction to database
        await sql`
          INSERT INTO mpesa_transactions (
            checkout_request_id,
            mpesa_receipt_number,
            transaction_date,
            amount,
            phone_number,
            result_code,
            result_desc,
            status,
            callback_data
          ) VALUES (
            ${checkoutRequestID},
            ${mpesaReceiptNumber},
            ${transactionDate},
            ${amount},
            ${phoneNumber},
            ${resultCode},
            ${resultDesc},
            'completed',
            ${JSON.stringify(body)}
          )
        `

        await ActivityLogger.logMpesaActivity(
          `Payment successful: KES ${amount} from ${phoneNumber}`,
          mpesaReceiptNumber,
          {
            amount,
            phone_number: phoneNumber,
            checkout_request_id: checkoutRequestID,
            transaction_date: transactionDate,
          },
          "SUCCESS",
        )
      } else {
        // Failed payment
        await sql`
          INSERT INTO mpesa_transactions (
            checkout_request_id,
            result_code,
            result_desc,
            status,
            callback_data
          ) VALUES (
            ${checkoutRequestID},
            ${resultCode},
            ${resultDesc},
            'failed',
            ${JSON.stringify(body)}
          )
        `

        await ActivityLogger.logMpesaActivity(
          `Payment failed: ${resultDesc}`,
          checkoutRequestID,
          {
            result_code: resultCode,
            result_desc: resultDesc,
            checkout_request_id: checkoutRequestID,
          },
          "ERROR",
        )
      }
    } else if (body.TransactionType) {
      // C2B callback
      const transactionType = body.TransactionType
      const transID = body.TransID
      const transTime = body.TransTime
      const transAmount = body.TransAmount
      const businessShortCode = body.BusinessShortCode
      const billRefNumber = body.BillRefNumber
      const invoiceNumber = body.InvoiceNumber
      const orgAccountBalance = body.OrgAccountBalance
      const thirdPartyTransID = body.ThirdPartyTransID
      const msisdn = body.MSISDN
      const firstName = body.FirstName
      const middleName = body.MiddleName
      const lastName = body.LastName

      // Save C2B transaction
      await sql`
        INSERT INTO mpesa_transactions (
          transaction_id,
          transaction_type,
          transaction_time,
          amount,
          business_short_code,
          bill_ref_number,
          invoice_number,
          org_account_balance,
          third_party_trans_id,
          phone_number,
          first_name,
          middle_name,
          last_name,
          status,
          callback_data
        ) VALUES (
          ${transID},
          ${transactionType},
          ${transTime},
          ${transAmount},
          ${businessShortCode},
          ${billRefNumber},
          ${invoiceNumber},
          ${orgAccountBalance},
          ${thirdPartyTransID},
          ${msisdn},
          ${firstName},
          ${middleName},
          ${lastName},
          'completed',
          ${JSON.stringify(body)}
        )
      `

      await ActivityLogger.logMpesaActivity(
        `C2B Payment received: KES ${transAmount} from ${firstName} ${lastName} (${msisdn})`,
        transID,
        {
          transaction_type: transactionType,
          amount: transAmount,
          phone_number: msisdn,
          bill_ref_number: billRefNumber,
          customer_name: `${firstName} ${middleName} ${lastName}`.trim(),
        },
        "SUCCESS",
      )
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    })
  } catch (error) {
    console.error("MPESA callback error:", error)

    await ActivityLogger.logMpesaActivity(
      "MPESA callback processing failed",
      undefined,
      {
        error: error instanceof Error ? error.message : "Unknown error",
        request_body: await request.text(),
      },
      "ERROR",
    )

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: "Failed to process callback",
      },
      { status: 500 },
    )
  }
}
