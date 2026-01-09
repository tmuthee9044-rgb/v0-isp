import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function POST() {
  let pool: Pool | null = null;
  
  try {
    const localUrl = process.env.DATABASE_URL;
    
    if (!localUrl) {
      return NextResponse.json({ 
        success: false, 
        error: "DATABASE_URL not configured" 
      }, { status: 500 });
    }

    pool = new Pool({ connectionString: localUrl });

    // Read and execute the SQL script
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix-locations-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);

    return NextResponse.json({
      success: true,
      message: "Locations table schema fixed successfully"
    });

  } catch (error: any) {
    console.error("Error fixing locations schema:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    if (pool) await pool.end();
  }
}
