// เรียก API ของเซิร์ฟเวอร์ (ที่อยู่เดียวกับหน้าเกม · ตอน npm run dev ใช้ proxy ของ Vite)
export type Account = { token: string; id: string; name: string | null; save: any; savedAt: number };

// VITE_ONLINE_URL = ที่อยู่เซิร์ฟเวอร์ (เช่น https://inkworld-online.onrender.com) ตอนหน้าเกมอยู่บน GitHub Pages · ว่าง = โดเมนเดียวกับหน้าเกม
const BASE = String((import.meta as any).env?.VITE_ONLINE_URL || '').replace(/\/$/, '');
export const wsUrl = (token: string) => {
  const b = BASE ? new URL(BASE) : new URL(location.href);
  return (b.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + b.host + '/ws?token=' + encodeURIComponent(token);
};

async function call(path: string, method: string, body?: any, token?: string) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (' + r.status + ')'), { status: r.status, data: j });
  return j;
}
export const Api = {
  register: (id: string, pass: string): Promise<Account> => call('/api/register', 'POST', { id, pass }),
  login: (id: string, pass: string): Promise<Account> => call('/api/login', 'POST', { id, pass }),
  me: (token: string): Promise<Account> => call('/api/me', 'GET', undefined, token),
  setName: (token: string, name: string) => call('/api/name', 'POST', { name }, token),
  invite: (token: string, code: string) => call('/api/invite', 'POST', { code }, token),
  putSave: (token: string, save: any, savedAt: number, force = false) => call('/api/save', 'PUT', { save, savedAt, force }, token),
  beaconSave(token: string, save: any, savedAt: number) {
    try { return navigator.sendBeacon(BASE + '/api/save-beacon', new Blob([JSON.stringify({ token, save, savedAt, force: false })], { type: 'text/plain' })); } catch { return false; }
  }
};
