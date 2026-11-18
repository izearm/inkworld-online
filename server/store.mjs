// ที่เก็บบัญชี + เซฟ · มี DATABASE_URL → PostgreSQL (Render Postgres) · ไม่มี → ไฟล์ JSON (ทดสอบในเครื่อง)
import fs from 'node:fs';
import path from 'node:path';

export async function openStore(opts = {}) {
  const url = opts.databaseUrl ?? process.env.DATABASE_URL;
  return url ? openPg(url) : openFile(opts.dataFile ?? process.env.DATA_FILE ?? path.resolve('server-data/accounts.json'));
}

// บัญชี: { id, salt, hash, token, name, nameKey, save, savedAt, createdAt }
function openFile(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let db = { accounts: {} };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ไฟล์ใหม่ */ }
  let timer = null;
  const flush = () => { timer = null; const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, file); };
  const dirty = () => { if (!timer) timer = setTimeout(flush, 200); };
  const acc = () => Object.values(db.accounts);
  return {
    kind: 'file',
    async get(id) { return db.accounts[id] || null; },
    async byToken(token) { return acc().find(a => a.token === token) || null; },
    async nameTaken(nameKey, exceptId) { return acc().some(a => a.nameKey === nameKey && a.id !== exceptId); },
    async create(a) { if (db.accounts[a.id]) return false; db.accounts[a.id] = a; dirty(); return true; },
    async update(id, patch) { const a = db.accounts[id]; if (!a) return null; Object.assign(a, patch); dirty(); return a; },
    async close() { if (timer) { clearTimeout(timer); flush(); } }
  };
}

async function openPg(url) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
  await pool.query(`CREATE TABLE IF NOT EXISTS iw_accounts (
    id TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, token TEXT, name TEXT, name_key TEXT UNIQUE,
    save JSONB, saved_at BIGINT DEFAULT 0, created_at BIGINT NOT NULL)`);
  const row = r => r && { id: r.id, salt: r.salt, hash: r.hash, token: r.token, name: r.name, nameKey: r.name_key, save: r.save, savedAt: Number(r.saved_at) || 0, createdAt: Number(r.created_at) };
  const col = { salt: 'salt', hash: 'hash', token: 'token', name: 'name', nameKey: 'name_key', save: 'save', savedAt: 'saved_at' };
  return {
    kind: 'pg',
    async get(id) { return row((await pool.query('SELECT * FROM iw_accounts WHERE id=$1', [id])).rows[0]); },
    async byToken(token) { return row((await pool.query('SELECT * FROM iw_accounts WHERE token=$1', [token])).rows[0]); },
    async nameTaken(nameKey, exceptId) { return (await pool.query('SELECT 1 FROM iw_accounts WHERE name_key=$1 AND id<>$2', [nameKey, exceptId])).rowCount > 0; },
    async create(a) {
      const r = await pool.query('INSERT INTO iw_accounts (id,salt,hash,token,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [a.id, a.salt, a.hash, a.token, a.createdAt]);
      return r.rowCount === 1;
    },
    async update(id, patch) {
      const keys = Object.keys(patch).filter(k => col[k]); if (!keys.length) return this.get(id);
      const vals = keys.map(k => k === 'save' ? JSON.stringify(patch[k]) : patch[k]);
      await pool.query(`UPDATE iw_accounts SET ${keys.map((k, i) => col[k] + '=$' + (i + 2)).join(',')} WHERE id=$1`, [id, ...vals]);
      return this.get(id);
    },
    async close() { await pool.end(); }
  };
}
