// Script to run the sync in batches
async function runSync() {
  const BATCH_SIZE = 10;
  let offset = 0;
  let total = 1; // Start with > offset

  console.log("Starting schema sync...");

  while (offset < total) {
    try {
      const response = await fetch('http://localhost:3000/api/admin/sync-schema-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, limit: BATCH_SIZE })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      total = data.total;
      
      console.log(`Processed batch ${offset} to ${offset + BATCH_SIZE} of ${total}`);
      data.results.forEach((r: any) => {
        if (r.status !== 'ok') {
          console.log(`  - ${r.table}: ${r.status} ${r.columnsAdded ? `(${r.columnsAdded.join(', ')})` : ''}`);
        }
      });

      offset += BATCH_SIZE;
    } catch (e) {
      console.error("Error in batch:", e);
      break;
    }
  }
  console.log("Sync complete.");
}

runSync();
