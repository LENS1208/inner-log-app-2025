import { parseCsvText } from '../lib/csv';
import { insertTrades, tradeToDb } from '../lib/db.service';

async function migrateDemoData() {
  const datasets = ['A', 'B', 'C'];
  let totalMigrated = 0;

  for (const dataset of datasets) {
    const url = `/demo/${dataset}.csv`;
    try {
      console.log(`Loading ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to load ${url}: ${response.status}`);
        continue;
      }

      const text = await response.text();
      const trades = parseCsvText(text);

      if (trades.length === 0) {
        console.warn(`No trades found in ${url}`);
        continue;
      }

      console.log(`Found ${trades.length} trades in ${url}`);

      const dbTrades = trades.map(tradeToDb);
      await insertTrades(dbTrades);

      totalMigrated += trades.length;
      console.log(`✓ Migrated ${trades.length} trades from ${dataset}.csv`);
    } catch (error) {
      console.error(`Error migrating ${dataset}.csv:`, error);
    }
  }

  console.log(`\n✓ Migration complete: ${totalMigrated} total trades migrated`);
  return totalMigrated;
}

if (typeof window !== 'undefined') {
  (window as any).migrateDemoData = migrateDemoData;
  console.log('Migration script loaded. Run migrateDemoData() in console to migrate demo data.');
}

export { migrateDemoData };
