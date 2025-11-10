import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [article] = await sql`
      SELECT 
        kb.*,
        e.first_name || ' ' || e.last_name as author_name
      FROM knowledge_base kb
      LEFT JOIN employees e ON kb.author_id = e.id
      WHERE kb.id = ${params.id}
    `

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Increment view count
    await sql`UPDATE knowledge_base SET views = views + 1 WHERE id = ${params.id}`

    return NextResponse.json({ article })
  } catch (error) {
    console.error("Error fetching article:", error)
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { title, content, category, tags } = body

    const [article] = await sql`
      UPDATE knowledge_base 
      SET title = ${title}, content = ${content}, category = ${category}, 
          tags = ${tags}, updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error("Error updating article:", error)
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [article] = await sql`
      DELETE FROM knowledge_base 
      WHERE id = ${params.id}
      RETURNING *
    `

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Article deleted successfully" })
  } catch (error) {
    console.error("Error deleting article:", error)
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 })
  }
}
