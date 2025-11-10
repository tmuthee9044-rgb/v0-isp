import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    let headers: string[] = []
    let rows: string[][] = []

    // Parse CSV/TSV files
    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length === 0) {
        return NextResponse.json({ error: "File is empty" }, { status: 400 })
      }

      // Detect delimiter
      const firstLine = lines[0]
      const delimiter = firstLine.includes("\t") ? "\t" : ","

      headers = firstLine.split(delimiter).map((h) => h.trim().replace(/"/g, ""))
      rows = lines.slice(1).map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/"/g, "")))
    }
    // Parse JSON files
    else if (file.name.endsWith(".json")) {
      const jsonData = JSON.parse(text)
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        headers = Object.keys(jsonData[0])
        rows = jsonData.map((item) => headers.map((header) => item[header] || ""))
      }
    } else {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 })
    }

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json({ error: "No data found in file" }, { status: 400 })
    }

    return NextResponse.json({
      headers,
      rows,
      totalRows: rows.length,
      message: "File analyzed successfully",
    })
  } catch (error) {
    console.error("File analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze file" }, { status: 500 })
  }
}
