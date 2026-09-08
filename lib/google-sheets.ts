const SHEETS = {
  Bookings: ['id', 'line_user_id', 'customer_name', 'phone', 'service_id', 'service_name', 'barber_id', 'barber_name', 'appointment_date', 'appointment_time', 'status', 'created_at'],
  Barbers: ['id', 'name', 'role', 'line_target_id', 'active'],
  Services: ['id', 'name', 'duration_minutes', 'price_satang', 'active'],
  Payments: ['id', 'booking_id', 'amount_satang', 'slip_object_key', 'trans_ref', 'verification_status', 'verified_at'],
} as const;

let accessToken: { value: string; expiresAt: number } | null = null;
let setupPromise: Promise<void> | null = null;

function required(name: 'GOOGLE_SHEET_ID' | 'GOOGLE_SERVICE_ACCOUNT_EMAIL' | 'GOOGLE_PRIVATE_KEY') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function base64Url(value: string | Uint8Array) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken() {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const pem = required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const keyBytes = Buffer.from(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''), 'base64');
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${base64Url(new Uint8Array(signature))}` }),
  });
  const result = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description ?? 'Google authentication failed');
  accessToken = { value: result.access_token, expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000 };
  return accessToken.value;
}

async function googleFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${required('GOOGLE_SHEET_ID')}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(`Google Sheets API ${response.status}: ${await response.text()}`);
  return response;
}

export async function getValues(range: string) {
  const response = await googleFetch(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`);
  const result = await response.json() as { values?: string[][] };
  return result.values ?? [];
}

export async function appendValues(sheet: keyof typeof SHEETS, row: Array<string | number | boolean | null>) {
  await ensureSheets();
  await googleFetch(`/values/${encodeURIComponent(`${sheet}!A:Z`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: [row] }),
  });
}

export async function updateCell(sheet: keyof typeof SHEETS, row: number, column: string, value: string) {
  await googleFetch(`/values/${encodeURIComponent(`${sheet}!${column}${row}`)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[value]] }),
  });
}

async function setupSheets() {
  const metadata = await googleFetch('?fields=sheets.properties.title');
  const data = await metadata.json() as { sheets?: Array<{ properties?: { title?: string } }> };
  const existing = new Set((data.sheets ?? []).map((sheet) => sheet.properties?.title));
  const missing = Object.keys(SHEETS).filter((title) => !existing.has(title));
  if (missing.length) {
    await googleFetch(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }) });
  }
  for (const [title, headers] of Object.entries(SHEETS)) {
    const rows = await getValues(`${title}!A1:Z1`);
    if (!rows.length) {
      await googleFetch(`/values/${encodeURIComponent(`${title}!A1`)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [headers] }) });
    }
  }
}

export async function ensureSheets() {
  setupPromise ??= setupSheets().catch((error) => { setupPromise = null; throw error; });
  return setupPromise;
}

export type SheetBooking = {
  id: string; lineUserId: string; customerName: string; phone: string; serviceId: string; serviceName: string;
  barberId: string; barberName: string; date: string; time: string; status: string; createdAt: string; row: number;
};

export async function getBookings() {
  await ensureSheets();
  const rows = await getValues('Bookings!A2:L');
  return rows.map((row, index): SheetBooking => ({
    id: row[0] ?? '', lineUserId: row[1] ?? '', customerName: row[2] ?? '', phone: row[3] ?? '', serviceId: row[4] ?? '',
    serviceName: row[5] ?? '', barberId: row[6] ?? '', barberName: row[7] ?? '', date: row[8] ?? '', time: row[9] ?? '',
    status: row[10] ?? '', createdAt: row[11] ?? '', row: index + 2,
  }));
}

export async function upsertCatalogRow(sheet: 'Barbers' | 'Services', id: string, row: Array<string | number | boolean>) {
  await ensureSheets();
  const rows = await getValues(`${sheet}!A2:A`);
  if (!rows.some((item) => item[0] === id)) await appendValues(sheet, row);
}

export async function getBarberTarget(barberId: string) {
  await ensureSheets();
  const rows = await getValues('Barbers!A2:E');
  return rows.find((row) => row[0] === barberId)?.[3] || process.env.LINE_STAFF_GROUP_ID || '';
}

export async function getBarbers() {
  await ensureSheets();
  return (await getValues('Barbers!A2:E')).map((r, i) => ({ id: r[0], name: r[1] || '', role: r[2] || '', target: r[3] || '', active: String(r[4]).toLowerCase() === 'true', row: i + 2 })).filter(b => b.id);
}

export async function registerBarberTarget(barberId: string, targetId: string) {
  await ensureSheets();
  const rows = await getValues('Barbers!A2:E');
  const index = rows.findIndex((row) => row[0] === barberId);
  if (index < 0) return false;
  await updateCell('Barbers', index + 2, 'D', targetId);
  return true;
}
