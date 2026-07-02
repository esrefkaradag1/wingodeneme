const { Client } = require('pg');

async function test() {
  const connectionString = "postgresql://postgres.somwrfqnshyevpxzpodo:gmup3fQEoeXUsF1H@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  console.log('--- Raw DB Latency Test (pg) ---');
  const client = new Client({ connectionString });
  
  const start = Date.now();
  try {
    await client.connect();
    console.log(`Connection established in: ${Date.now() - start}ms`);

    for (let i = 1; i <= 3; i++) {
        const qStart = Date.now();
        await client.query('SELECT 1');
        console.log(`Query ${i} (SELECT 1) took: ${Date.now() - qStart}ms`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test();
