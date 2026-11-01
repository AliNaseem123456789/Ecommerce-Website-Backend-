/**
 * Seed the three checkout shipping options. Safe to re-run: skips codes that exist.
 * Run from Ecommerce-Backend/api: node scripts/seed-shipping-options.js
 */
require('dotenv').config();
const { Client } = require('pg');

const rows = [
  {
    code: 'standard',
    title: 'Standard Shipping',
    price: 6.95,
    min_days: 5,
    max_days: 7,
    free_over: 100,
    sort_order: 1,
  },
  {
    code: 'express',
    title: 'Express Shipping',
    price: 14.95,
    min_days: 2,
    max_days: 3,
    free_over: null,
    sort_order: 2,
  },
  {
    code: 'overnight',
    title: 'Overnight Shipping',
    price: 29.95,
    min_days: 1,
    max_days: 1,
    free_over: null,
    sort_order: 3,
  },
];

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  for (const row of rows) {
    await db.query(
      `insert into shipping_options (code, title, price, min_days, max_days, free_over, active, sort_order)
       values ($1,$2,$3,$4,$5,$6,true,$7)
       on conflict (code) do nothing`,
      [
        row.code,
        row.title,
        row.price,
        row.min_days,
        row.max_days,
        row.free_over,
        row.sort_order,
      ],
    );
  }
  const result = await db.query(
    'select code, price, min_days, max_days, free_over from shipping_options order by sort_order',
  );
  console.log(result.rows);
  await db.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
