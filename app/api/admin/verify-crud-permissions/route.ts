import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    // Test CREATE permission
    const createTest = await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS _permission_test (
        id SERIAL PRIMARY KEY,
        test_data TEXT
      );
    `)

    // Test INSERT permission
    await sql.unsafe(`
      INSERT INTO _permission_test (test_data) VALUES ('test');
    `)

    // Test SELECT permission
    const selectTest = await sql.unsafe(`
      SELECT * FROM _permission_test LIMIT 1;
    `)

    // Test UPDATE permission
    await sql.unsafe(`
      UPDATE _permission_test SET test_data = 'updated' WHERE id = (SELECT id FROM _permission_test LIMIT 1);
    `)

    // Test DELETE permission
    await sql.unsafe(`
      DELETE FROM _permission_test;
    `)

    // Test DROP permission
    await sql.unsafe(`
      DROP TABLE _permission_test;
    `)

    // Check user privileges
    const privileges = await sql.unsafe(`
      SELECT 
        rolname,
        rolsuper as is_superuser,
        rolcreatedb as can_create_db,
        rolcreaterole as can_create_role
      FROM pg_roles 
      WHERE rolname = current_user;
    `)

    return NextResponse.json({
      success: true,
      message: "All CRUD operations are working correctly",
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      userPrivileges: privileges[0],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "CRUD operations test failed. Run the fix_postgresql_permissions.sh script.",
      },
      { status: 500 },
    )
  }
}
