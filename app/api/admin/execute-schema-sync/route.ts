import { NextResponse } from "next/server"
import { Pool } from "pg"
const { spawn } = require("child_process")

export async function POST() {
  try {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    })

    console.log("[SCHEMA_SYNC] Starting synchronization of all 146 tables...")

    const syncProcess = spawn("npx", ["tsx", "scripts/create-all-146-tables.ts"])

    let output = ""
    let errorOutput = ""

    syncProcess.stdout.on("data", (data: Buffer) => {
      output += data.toString()
      console.log(data.toString())
    })

    syncProcess.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString()
      console.error(data.toString())
    })

    return new Promise((resolve) => {
      syncProcess.on("close", (code: number) => {
        pool.end()

        if (code === 0) {
          resolve(
            NextResponse.json({
              success: true,
              message: "All 146 tables synced successfully",
              output,
            }),
          )
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                message: "Schema sync completed with errors",
                output,
                errors: errorOutput,
              },
              { status: 500 },
            ),
          )
        }
      })
    })
  } catch (error: any) {
    console.error("[SCHEMA_SYNC] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute schema sync",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
