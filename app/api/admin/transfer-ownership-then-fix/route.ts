import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
  try {
    console.log("[v0] Starting ownership transfer and schema fix...")

    // Step 1: Transfer ownership
    console.log("[v0] Step 1: Transferring table ownership to isp_admin...")
    const { stdout: ownershipOutput, stderr: ownershipError } = await execAsync(
      "sudo bash scripts/transfer_table_ownership.sh",
    )

    if (ownershipError) {
      console.error("[v0] Ownership transfer warnings:", ownershipError)
    }
    console.log("[v0] Ownership transfer output:", ownershipOutput)

    // Step 2: Run schema fix
    console.log("[v0] Step 2: Running schema fix to add missing columns...")
    const { stdout: schemaOutput, stderr: schemaError } = await execAsync(
      "psql -U isp_admin -d isp_system -f scripts/fix_all_missing_columns.sql",
    )

    if (schemaError) {
      console.error("[v0] Schema fix warnings:", schemaError)
    }
    console.log("[v0] Schema fix output:", schemaOutput)

    return NextResponse.json({
      success: true,
      message: "Ownership transferred and schema fixed successfully",
      details: {
        ownership: ownershipOutput,
        schema: schemaOutput,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in transfer-ownership-then-fix:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stderr || error.stdout,
      },
      { status: 500 },
    )
  }
}
