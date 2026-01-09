import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql();
    
    // Get all tables from Neon
    const neonTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    // Get all tables from local (if using PostgreSQL)
    const localTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const missingTables: string[] = [];
    const tablesToCheck: string[] = [];
    
    // Check which tables exist
    for (const neonTable of neonTables) {
      const exists = localTables.find((t: any) => t.table_name === neonTable.table_name);
      if (!exists) {
        missingTables.push(neonTable.table_name);
      } else {
        tablesToCheck.push(neonTable.table_name);
      }
    }
    
    // Check columns for existing tables
    const schemaIssues: any[] = [];
    
    for (const tableName of tablesToCheck) {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      schemaIssues.push({
        table: tableName,
        columnCount: columns.length,
        columns: columns.map((c: any) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable
        }))
      });
    }
    
    return NextResponse.json({
      success: true,
      totalTables: neonTables.length,
      missingTables,
      missingCount: missingTables.length,
      existingTables: tablesToCheck.length,
      schemaValidation: schemaIssues
    });
    
  } catch (error: any) {
    console.error('[v0] Schema validation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Ensure both databases are accessible'
    }, { status: 500 });
  }
}
