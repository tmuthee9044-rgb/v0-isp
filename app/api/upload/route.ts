import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    // In a production environment, you would upload to a storage service like Vercel Blob, AWS S3, etc.
    // For now, we'll simulate the upload and store the file path in system_config

    const fileName = `${type}_${Date.now()}_${file.name}`
    const filePath = `/uploads/${fileName}`

    // Store file path in system_config
    await sql`
      INSERT INTO system_config (key, value, created_at) 
      VALUES (${`file_${type}`}, ${filePath}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${filePath}, created_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({
      success: true,
      message: `${type} uploaded successfully`,
      filePath,
    })
  } catch (error) {
    console.error(`Error uploading file:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload file",
      },
      { status: 500 },
    )
  }
}
