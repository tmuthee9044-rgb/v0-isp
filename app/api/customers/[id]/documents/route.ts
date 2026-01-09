import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Get documents for the customer
    const documents = await sql`
      SELECT 
        cd.*,
        u.username as uploaded_by_name
      FROM customer_documents cd
      LEFT JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.customer_id = ${customerId}
      AND cd.status = 'active'
      ORDER BY cd.created_at DESC
    `

    return NextResponse.json({
      success: true,
      documents: documents || [],
    })
  } catch (error) {
    console.error("Error fetching customer documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const documentType = (formData.get("documentType") as string) || "contract"
    const description = (formData.get("description") as string) || ""
    const tags = (formData.get("tags") as string) || ""
    const isConfidential = formData.get("isConfidential") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large (max 10MB)" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    // Create file path
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = `/uploads/documents/customer_${customerId}/${fileName}`

    // In a real implementation, you would save the file to storage
    // For now, we'll simulate the file upload
    const fileBuffer = await file.arrayBuffer()

    // Parse tags
    const tagsArray = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    // Insert document record
    const [document] = await sql`
      INSERT INTO customer_documents (
        customer_id,
        document_name,
        document_type,
        file_path,
        file_name,
        file_size,
        mime_type,
        description,
        tags,
        is_confidential,
        uploaded_by
      ) VALUES (
        ${customerId},
        ${file.name},
        ${documentType},
        ${filePath},
        ${fileName},
        ${file.size},
        ${file.type},
        ${description},
        ${tagsArray},
        ${isConfidential},
        1
      )
      RETURNING *
    `

    // Log the upload action
    await sql`
      INSERT INTO customer_document_access_logs (
        document_id,
        user_id,
        action,
        ip_address
      ) VALUES (
        ${document.id},
        1,
        'upload',
        ${request.ip || "127.0.0.1"}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      document,
    })
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
