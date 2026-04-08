const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // One-time table setup (safe to run every call)
  await sql`
    CREATE TABLE IF NOT EXISTS today_menu (
      id      INTEGER PRIMARY KEY,
      items   JSONB   NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO today_menu (id, items) VALUES (1, '[]') ON CONFLICT (id) DO NOTHING
  `;

  if (req.method === 'GET') {
    const rows = await sql`SELECT items, updated_at FROM today_menu WHERE id = 1`;
    return res.json({ items: rows[0]?.items ?? [], updated_at: rows[0]?.updated_at });
  }

  if (req.method === 'POST') {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
    await sql`
      UPDATE today_menu
      SET items = ${JSON.stringify(items)}::jsonb, updated_at = NOW()
      WHERE id = 1
    `;
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
