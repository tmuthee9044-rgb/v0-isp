import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const articles = await sql`
      SELECT 
        kb.id,
        kb.title,
        kb.content,
        kb.category,
        kb.tags,
        kb.views,
        kb.created_at,
        kb.updated_at,
        e.first_name || ' ' || e.last_name as author_name
      FROM knowledge_base kb
      LEFT JOIN employees e ON kb.author_id = e.id
      ORDER BY kb.updated_at DESC
    `

    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Error fetching knowledge base articles:", error)
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, category, tags, author_id } = body

    const [article] = await sql`
      INSERT INTO knowledge_base (
        title, content, category, tags, author_id, views, created_at, updated_at
      ) VALUES (
        ${title}, ${content}, ${category}, ${tags}, ${author_id}, 0, NOW(), NOW()
      ) RETURNING *
    `

    return NextResponse.json({ article }, { status: 201 })
  } catch (error) {
    console.error("Error creating knowledge base article:", error)
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 })
  }
}
