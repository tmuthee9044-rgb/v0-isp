import { runInvoiceItemsMigration } from "@/app/actions/run-migration"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const result = await runInvoiceItemsMigration()

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
