import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// Ensure the access logs table has proper auto-increment id
async function ensureAccessLogsTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS customer_document_access_logs (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL,
      user_id INTEGER,
      action VARCHAR(50) NOT NULL,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `.catch(() => {})

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_document_access_logs' 
        AND column_name = 'id' 
        AND column_default IS NOT NULL
      ) THEN
        CREATE SEQUENCE IF NOT EXISTS customer_document_access_logs_id_seq;
        ALTER TABLE customer_document_access_logs 
          ALTER COLUMN id SET DEFAULT nextval('customer_document_access_logs_id_seq');
        PERFORM setval('customer_document_access_logs_id_seq', COALESCE((SELECT MAX(id) FROM customer_document_access_logs), 0) + 1, false);
      END IF;
    END $$;
  `.catch(() => {})
}

export async function GET(request: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  try {
    const sql = await getSql()

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
    await ensureAccessLogsTable(sql)
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
    `.catch((e: unknown) => console.error("[v0] Failed to log document view:", e))

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
    const sql = await getSql()

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
    await ensureAccessLogsTable(sql)
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
    `.catch((e: unknown) => console.error("[v0] Failed to log document delete:", e))

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
