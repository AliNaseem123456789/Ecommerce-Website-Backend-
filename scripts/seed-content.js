/**
 * Seeds brands, collections, promotions and the landing-page layout.
 *
 * Nothing is hardcoded against product ids: brands are matched against your
 * real product names, and collection membership is worked out by query.
 *
 * Run from Ecommerce-Backend/api:
 *   node scripts/seed-content.js --dry-run   see exactly what it would do
 *   node scripts/seed-content.js             write it
 *   node scripts/seed-content.js --reset     delete seeded rows first
 *
 * Safe to run twice: existing rows are matched by slug/headline and skipped.
 */
require('dotenv').config();
const { Client } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');

/* --------------------------------- brands -------------------------------- */
// `match` are case-insensitive substrings tested against the product name.
// Rename these freely — the slug is derived from the name on insert.
const BRANDS = [
  {
    name: 'LEGO',
    description: 'Build-it-yourself sets for every age.',
    featured: true,
    sort_order: 1,
    match: ['lego', 'creator', 'brick'],
  },
  {
    name: 'Xiaomi',
    description: 'Everyday tech that punches above its price.',
    featured: true,
    sort_order: 2,
    match: ['xiaomi', 'redmi', 'mi band', 'poco'],
  },
  {
    name: 'Soundcore',
    description: 'Audio, charging and the cables in between.',
    featured: true,
    sort_order: 3,
    match: [
      'earbud', 'ear bud', 'headphone', 'headset', 'speaker',
      'charger', 'charging', 'power bank', 'cable', 'bluetooth',
    ],
  },
  {
    name: 'Krosno',
    description: 'Glassware made for the table.',
    featured: true,
    sort_order: 4,
    match: ['glass', 'flute', 'tumbler', 'wine', 'champagne', 'mug', 'carafe'],
  },
];

/* ------------------------------ collections ------------------------------ */
// `pick` receives every product row and returns the ones that belong.
const COLLECTIONS = [
  {
    name: 'Tech essentials',
    headline: 'Tech essentials',
    description: 'The gadgets that quietly make the day easier.',
    sort_order: 1,
    pick: (products, categories) => {
      const id = categories.find((c) => /electronic/i.test(c.name))?.category_id;
      return products.filter((p) => p.category_id === id).slice(0, 12);
    },
  },
  {
    name: 'The kitchen edit',
    headline: 'The kitchen edit',
    description: 'Glassware and essentials worth setting the table for.',
    sort_order: 2,
    pick: (products, categories) => {
      const id = categories.find((c) => /home|kitchen/i.test(c.name))?.category_id;
      return products.filter((p) => p.category_id === id).slice(0, 12);
    },
  },
  {
    name: 'Gifts under $25',
    headline: 'Gifts under $25',
    description: 'Small things that still feel like a present.',
    sort_order: 3,
    pick: (products) =>
      products
        .filter((p) => Number(p.price) > 0 && Number(p.price) < 25)
        .sort((a, b) => Number(a.price) - Number(b.price))
        .slice(0, 12),
  },
];

/* ------------------------------ promotions ------------------------------- */
// No coupon_code on purpose: a promo advertising a code that does not exist
// in the coupons table would fail at checkout. Add codes once you create them.
const PROMOTIONS = [
  {
    headline: 'Free shipping over $100',
    subhead: 'Fill the basket, skip the delivery fee.',
    fine_print: 'Applies automatically at checkout.',
    badge: 'Always on',
    accent: 'sand',
    sort_order: 1,
    link: () => '/shop',
  },
  {
    headline: 'The kitchen event',
    subhead: 'Glassware and serveware for the season ahead.',
    badge: 'New',
    accent: 'sage',
    sort_order: 2,
    link: (categories) => {
      const id = categories.find((c) => /home|kitchen/i.test(c.name))?.category_id;
      return id ? `/shop?category=${id}` : '/shop';
    },
  },
  {
    headline: 'Toys they will actually play with',
    subhead: 'Building sets, cameras and more.',
    accent: 'blush',
    sort_order: 3,
    link: (categories) => {
      const id = categories.find((c) => /toy/i.test(c.name))?.category_id;
      return id ? `/shop?category=${id}` : '/shop';
    },
  },
  {
    headline: 'Everyday tech, under $50',
    subhead: 'Earbuds, mounts and chargers that just work.',
    fine_print: 'Selected items. While stocks last.',
    accent: 'mist',
    sort_order: 4,
    link: () => '/shop?maxPrice=50',
  },
];

/* --------------------------- landing page layout -------------------------- */
const SECTIONS = [
  { type: 'promo_grid', title: 'Deals worth a look', config: {} },
  {
    type: 'product_rail',
    title: 'Best sellers',
    subtitle: 'What everyone else is buying right now.',
    config: { source: 'best_sellers', limit: 10 },
  },
  { type: 'collection_grid', title: 'Curated for you', config: { limit: 4 } },
  {
    type: 'product_rail',
    title: 'New arrivals',
    subtitle: 'The latest additions to the shop.',
    config: { source: 'new_arrivals', limit: 10, tinted: true },
  },
  { type: 'shop_by_price', title: 'Shop by price', config: {} },
  {
    type: 'product_rail',
    title: 'Top rated',
    subtitle: 'Highest rated by customers who bought them.',
    config: { source: 'top_rated', limit: 10 },
  },
  { type: 'brand_strip', title: 'Shop by brand', config: {} },
  {
    type: 'product_rail',
    title: 'Most wishlisted',
    subtitle: 'Saved more than anything else in the store.',
    config: { source: 'most_wishlisted', limit: 10, tinted: true },
  },
  { type: 'testimonials', config: {} },
  { type: 'recently_viewed', config: {} },
];

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  const products = (
    await db.query(
      'SELECT product_id, name, price, category_id, brand_id FROM products ORDER BY product_id',
    )
  ).rows;
  const categories = (
    await db.query('SELECT category_id, name FROM categories ORDER BY category_id')
  ).rows;

  console.log(`${products.length} products, ${categories.length} categories\n`);

  if (RESET && !DRY_RUN) {
    await db.query('UPDATE products SET brand_id = NULL');
    await db.query('DELETE FROM collection_products');
    await db.query('DELETE FROM collections');
    await db.query('DELETE FROM brands');
    await db.query('DELETE FROM promotions');
    await db.query('DELETE FROM landing_sections');
    console.log('--reset: cleared brands, collections, promotions and sections\n');
  }

  /* ---- brands ---- */
  console.log('BRANDS');
  for (const brand of BRANDS) {
    const slug = slugify(brand.name);
    let row = (await db.query('SELECT brand_id FROM brands WHERE slug = $1', [slug]))
      .rows[0];

    const matched = products.filter((product) =>
      brand.match.some((needle) =>
        (product.name || '').toLowerCase().includes(needle),
      ),
    );

    console.log(
      `  ${brand.name.padEnd(12)} ${String(matched.length).padStart(2)} product(s)` +
        (matched.length
          ? `: ${matched.map((p) => `#${p.product_id} ${p.name}`).join(', ').slice(0, 110)}`
          : '  <- no name matches, assign manually in Admin -> Products'),
    );

    if (DRY_RUN) continue;

    if (!row) {
      row = (
        await db.query(
          `INSERT INTO brands (name, slug, description, featured, sort_order)
           VALUES ($1, $2, $3, $4, $5) RETURNING brand_id`,
          [brand.name, slug, brand.description, brand.featured, brand.sort_order],
        )
      ).rows[0];
    }

    for (const product of matched) {
      await db.query('UPDATE products SET brand_id = $2 WHERE product_id = $1', [
        product.product_id,
        row.brand_id,
      ]);
    }
  }

  /* ---- collections ---- */
  console.log('\nCOLLECTIONS');
  for (const collection of COLLECTIONS) {
    const slug = slugify(collection.name);
    const members = collection.pick(products, categories);
    console.log(
      `  ${collection.name.padEnd(18)} ${String(members.length).padStart(2)} product(s)`,
    );

    if (DRY_RUN || members.length === 0) continue;

    let row = (
      await db.query('SELECT collection_id FROM collections WHERE slug = $1', [slug])
    ).rows[0];

    if (!row) {
      row = (
        await db.query(
          `INSERT INTO collections (name, slug, headline, description, active, sort_order)
           VALUES ($1, $2, $3, $4, true, $5) RETURNING collection_id`,
          [
            collection.name,
            slug,
            collection.headline,
            collection.description,
            collection.sort_order,
          ],
        )
      ).rows[0];
    }

    await db.query('DELETE FROM collection_products WHERE collection_id = $1', [
      row.collection_id,
    ]);
    for (let index = 0; index < members.length; index += 1) {
      await db.query(
        `INSERT INTO collection_products (collection_id, product_id, sort_order)
         VALUES ($1, $2, $3)`,
        [row.collection_id, members[index].product_id, index],
      );
    }

    // Borrow the first product's image so the card is not blank.
    const image = (
      await db.query('SELECT image_url FROM products WHERE product_id = $1', [
        members[0].product_id,
      ])
    ).rows[0];
    if (image?.image_url) {
      await db.query(
        'UPDATE collections SET image_url = COALESCE(image_url, $2) WHERE collection_id = $1',
        [row.collection_id, image.image_url],
      );
    }
  }

  /* ---- promotions ---- */
  console.log('\nPROMOTIONS');
  for (const promo of PROMOTIONS) {
    const exists = (
      await db.query('SELECT promotion_id FROM promotions WHERE headline = $1', [
        promo.headline,
      ])
    ).rows[0];
    console.log(`  ${promo.headline}${exists ? '  (exists, skipped)' : ''}`);
    if (DRY_RUN || exists) continue;

    await db.query(
      `INSERT INTO promotions
         (headline, subhead, fine_print, badge, accent, link_url, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
      [
        promo.headline,
        promo.subhead || null,
        promo.fine_print || null,
        promo.badge || null,
        promo.accent,
        promo.link(categories),
        promo.sort_order,
      ],
    );
  }

  /* ---- landing sections ---- */
  console.log('\nLANDING SECTIONS');
  const sectionCount = Number(
    (await db.query('SELECT COUNT(*)::int AS count FROM landing_sections')).rows[0]
      .count,
  );
  if (sectionCount > 0) {
    console.log(`  ${sectionCount} already configured, leaving them alone`);
  } else {
    SECTIONS.forEach((section, index) =>
      console.log(`  ${index + 1}. ${section.title || section.type}`),
    );
    if (!DRY_RUN) {
      for (let index = 0; index < SECTIONS.length; index += 1) {
        const section = SECTIONS[index];
        await db.query(
          `INSERT INTO landing_sections (type, title, subtitle, config, position, active)
           VALUES ($1, $2, $3, $4::jsonb, $5, true)`,
          [
            section.type,
            section.title || null,
            section.subtitle || null,
            JSON.stringify(section.config || {}),
            index,
          ],
        );
      }
    }
  }

  console.log(
    DRY_RUN
      ? '\n--- dry run, nothing was written ---'
      : '\n--- done ---',
  );
  await db.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
