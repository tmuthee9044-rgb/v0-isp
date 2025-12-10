import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const sql = await getSql()

    const customerId = Number.parseInt(params.id)
    const docId = Number.parseInt(params.docId)

    if (isNaN(customerId) || isNaN(docId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 })
    }

    // Get document with file content
    const [document] = await sql`
      SELECT 
        id,
        document_name,
        file_name,
        file_size,
        mime_type,
        file_content
      FROM customer_documents
      WHERE id = ${docId}
      AND customer_id = ${customerId}
      AND status = 'active'
    `

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Log the download action
    await sql`
      INSERT INTO customer_document_access_logs (
        document_id,
        user_id,
        action,
        ip_address
      ) VALUES (
        ${docId},
        1,
        'download',
        ${request.ip || "127.0.0.1"}
      )
    `

    // Return file content with proper headers
    return new NextResponse(document.file_content, {
      status: 200,
      headers: {
        "Content-Type": document.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.file_name}"`,
        "Content-Length": document.file_size.toString(),
      },
    })
  } catch (error) {
    console.error("Error downloading document:", error)
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 })
  }
}
