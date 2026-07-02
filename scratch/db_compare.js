const { Client } = require('pg');

async function test(conn, label) {
  console.log(`--- Test: ${label} ---`);
  const client = new Client({ connectionString: conn });
  const start = Date.now();
  try {
    await client.connect();
    const connectTime = Date.now() - start;
    console.log(`Connection: ${connectTime}ms`);

    const qStart = Date.now();
    await client.query('SELECT 1');
    console.log(`Query took: ${Date.now() - qStart}ms`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  const pooler = "postgresql://postgres.somwrfqnshyevpxzpodo:gmup3fQEoeXUsF1H@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const direct = "postgresql://postgres.somwrfqnshyevpxzpodo:gmup3fQEoeXUsF1H@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
  
  await test(pooler, 'Pooler (6543)');
  console.log('\n');
  await test(direct, 'Direct (5432)');
}

run();
