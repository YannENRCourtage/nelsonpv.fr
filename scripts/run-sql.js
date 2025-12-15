const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { Client } = require('pg');

const sqlFile = process.argv[2] || 'supabase-schema.sql';
if (!fs.existsSync(sqlFile)) {
  console.error('SQL file not found:', sqlFile);
  process.exit(2);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

const conn = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
if (!conn) {
  console.error('No POSTGRES_URL (or POSTGRES_PRISMA_URL/DATABASE_URL) found in environment or .env');
  process.exit(3);
}

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database. Executing', sqlFile);
    // Split by $$? We'll run as a single query to allow functions/triggers; pg supports multiple statements in one query when not in prepared statements.
    await client.query(sql);
    console.log('SQL executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error executing SQL:', err);
    process.exit(1);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
