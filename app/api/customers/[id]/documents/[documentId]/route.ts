import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const documentId = Number.parseInt(params.documentId)

    if (isNaN(customerId) || isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Get specific document
    const [document] = await sql`
      SELECT 
        cd.*,
        u.username as uploaded_by_name
      FROM customer_documents cd
      LEFT JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.id = ${documentId}
      AND cd.customer_id = ${customerId}
      AND cd.status = 'active'
    `

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Log the view action
    await sql`
      INSERT INTO customer_document_access_logs (
        document_id,
        user_id,
        action,
        ip_address
      ) VALUES (
        ${documentId},
        1,
        'view',
        ${request.ip || "127.0.0.1"}
      )
    `

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const documentId = Number.parseInt(params.documentId)

    if (isNaN(customerId) || isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Soft delete the document
    await sql`
      UPDATE customer_documents 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${documentId}
      AND customer_id = ${customerId}
    `

    // Log the delete action
    await sql`
      INSERT INTO customer_document_access_logs (
        document_id,
        user_id,
        action,
        ip_address
      ) VALUES (
        ${documentId},
        1,
        'delete',
        ${request.ip || "127.0.0.1"}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
