import { NextResponse } from "next/server"
import { addMissingServiceColumns } from "@/app/actions/add-database-columns"

export async function POST() {
  const result = await addMissingServiceColumns()
  return NextResponse.json(result)
}
