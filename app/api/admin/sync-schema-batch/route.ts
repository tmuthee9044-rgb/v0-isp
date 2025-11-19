import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Helper to get explicit connections
async function getConnections() {
  // In this environment, we treat POSTGRES_URL as the "Source of Truth" (Neon)
  // and DATABASE_URL as the "Local/Target" (PostgreSQL offline)
  const neonUrl = process.env.POSTGRES_URL;
  const localUrl = process.env.DATABASE_URL;
  
  if (!neonUrl) throw new Error("POSTGRES_URL (Neon) not defined");
  if (!localUrl) throw new Error("DATABASE_URL (Local) not defined");
  
  const neonModule = await import("@neondatabase/serverless");
  const neonClient = neonModule.neon(neonUrl);
  const localPool = new Pool({ connectionString: localUrl });

  return { neonSql: neonClient, localPool };
}

export async function POST(request: Request) {
  let localPool: Pool | null = null;
  try {
    const { offset = 0, limit = 10 } = await request.json();
    const connections = await getConnections();
    const neonSql = connections.neonSql;
    localPool = connections.localPool;

    // 1. Get all tables from Neon
    const neonTables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    const totalTables = neonTables.length;
    const batch = neonTables.slice(offset, offset + limit);
    const results = [];

    for (const table of batch) {
      const tableName = table.table_name;
      
      // 2. Get columns for this table from Neon
      const neonColumns = await neonSql`
        SELECT column_name, data_type, is_nullable, column_default, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;

      // 3. Get Primary Key for this table from Neon
      const pkResult = await neonSql`
        SELECT c.column_name
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.columns c ON c.table_name = tc.table_name AND c.column_name = ccu.column_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ${tableName}
      `;
      const pkColumn = pkResult.length > 0 ? pkResult[0].column_name : null;

      // 4. Check if table exists locally
      const localTableCheck = await localPool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
        [tableName]
      );

      if (!localTableCheck.rows[0].exists) {
        // Create table
        const columnDefs = neonColumns.map((col: any) => {
          // Map types if necessary, but usually standard types work. 
          // Use udt_name for arrays or specific postgres types if needed, but data_type is safer for general sync.
          let type = col.data_type;
          if (type === 'USER-DEFINED') type = col.udt_name; // Handle enums/custom types roughly
          if (type === 'ARRAY') type = `${col.udt_name.replace('_', '')}[]`; // Rough array handling

          let def = `"${col.column_name}" ${type}`;
          
          // If it's the PK, make it PRIMARY KEY. 
          // Note: This is a simplified sync. Complex composite PKs are not handled here for brevity but covers 99% cases.
          if (col.column_name === pkColumn) {
            def += ' PRIMARY KEY';
          } else if (col.is_nullable === 'NO') {
            // If NOT NULL and no default, we might have issues inserting if we don't provide data.
            // But for schema creation it's fine.
            // def += ' NOT NULL'; 
            // SAFEST: Create as nullable initially to avoid insert errors during data sync later, 
            // or strictly follow schema. Let's strictly follow schema but be aware.
             def += ' NOT NULL';
          }
          
          return def;
        }).join(', ');

        try {
          await localPool.query(`CREATE TABLE "${tableName}" (${columnDefs})`);
          results.push({ table: tableName, status: 'created' });
        } catch (e: any) {
          results.push({ table: tableName, status: 'error_creating', error: e.message });
        }
      } else {
        // Table exists, check columns
        const localColumnsRes = await localPool.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
          [tableName]
        );
        const localColumnNames = new Set(localColumnsRes.rows.map((r: any) => r.column_name));

        const missingColumns = neonColumns.filter((col: any) => !localColumnNames.has(col.column_name));

        if (missingColumns.length > 0) {
          const addedCols = [];
          for (const col of missingColumns) {
             let type = col.data_type;
             if (type === 'USER-DEFINED') type = col.udt_name;
             if (type === 'ARRAY') type = `${col.udt_name.replace('_', '')}[]`;

             // Add as NULLable first to ensure it works even if table has data
             const def = `ADD COLUMN "${col.column_name}" ${type}`;
             try {
               await localPool.query(`ALTER TABLE "${tableName}" ${def}`);
               addedCols.push(col.column_name);
             } catch (e: any) {
               console.error(`Failed to add column ${col.column_name} to ${tableName}:`, e);
             }
          }
          results.push({ table: tableName, status: 'updated', columnsAdded: addedCols });
        } else {
          results.push({ table: tableName, status: 'ok' });
        }
      }
    }

    return NextResponse.json({
      batch: { offset, limit },
      total: totalTables,
      results
    });

  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (localPool) await localPool.end();
  }
}
