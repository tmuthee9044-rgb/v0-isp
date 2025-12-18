import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Get documents for the customer (exclude file_content from list view for performance)
    const documents = await sql`
      SELECT 
        cd.id,
        cd.customer_id,
        cd.document_name,
        cd.document_type,
        cd.file_name,
        cd.file_size,
        cd.mime_type,
        cd.description,
        cd.tags,
        cd.is_confidential,
        cd.created_at,
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
    const sql = await getSql()

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

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Parse tags
    const tagsArray = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    // Generate file path for storage reference
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `/uploads/documents/customer_${customerId}/${sanitizedFileName}`

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
        uploaded_by,
        file_content
      ) VALUES (
        ${customerId},
        ${file.name},
        ${documentType},
        ${filePath},
        ${sanitizedFileName},
        ${file.size},
        ${file.type},
        ${description},
        ${tagsArray},
        ${isConfidential},
        1,
        ${fileBuffer}
      )
      RETURNING id, customer_id, document_name, document_type, file_path, file_name, file_size, mime_type, description, tags, is_confidential, uploaded_by, created_at
    `

    await sql`
      INSERT INTO system_logs (
        level,
        source,
        category,
        message,
        details
      ) VALUES (
        'INFO',
        'document-upload',
        'customer',
        ${`Document uploaded for customer ${customerId}: ${file.name}`},
        ${JSON.stringify({
          documentId: document.id,
          customerId,
          fileName: file.name,
          fileSize: file.size,
          documentType,
        })}
      )
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
    console.error("[v0] Error uploading document:", error)

    try {
      const sql = await getSql()
      await sql`
        INSERT INTO system_logs (
          level,
          source,
          category,
          message,
          details
        ) VALUES (
          'ERROR',
          'document-upload',
          'customer',
          'Failed to upload customer document',
          ${JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            customerId: params.id,
          })}
        )
      `
    } catch (logError) {
      console.error("[v0] Failed to log error:", logError)
    }

    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
