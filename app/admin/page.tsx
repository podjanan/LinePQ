'use client';
import { FormEvent, useState } from 'react';
type Barber = { id: string; name: string; role: string; target: string; active: boolean };
const empty = { id: '', name: '', role: '', target: '', active: true };
export default function AdminPage() {
  const [key, setKey] = useState(''), [logged, setLogged] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [barbers, setBarbers] = useState<Barber[]>([]), [draft, setDraft] = useState<Barber>(empty);
  async function load() {
    const response = await fetch('/api/admin/barbers', { headers: { authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(await response.text());
    setBarbers((await response.json()).barbers); setLogged(true);
  }
  async function login(e: FormEvent) { e.preventDefault(); setBusy(true); setMessage(''); try { await load(); } catch { setMessage('เข้าสู่ระบบไม่สำเร็จ ตรวจรหัสเจ้าของร้านและการเชื่อมต่อ Google Sheets'); } finally { setBusy(false); } }
  async function save(value: Barber) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/barbers', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(value) });
      if (!response.ok) throw new Error('บันทึกไม่สำเร็จ ตรวจข้อมูลและโหลดใหม่ก่อนลองอีกครั้ง');
      await load(); setDraft(empty); setMessage('บันทึกเรียบร้อยแล้ว');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'); } finally { setBusy(false); }
  }
  return <main className="app-shell" style={{ maxWidth: 760, paddingTop: 28 }}><a href="/">← หน้าจองคิว</a><h1>จัดการช่าง</h1><p>เพิ่มทีมช่างและเลือกผู้รับแจ้งเตือนคิว</p>
    {!logged ? <form className="form-card" onSubmit={login}><label>รหัสเจ้าของร้าน<input type="password" autoComplete="current-password" value={key} onChange={e => setKey(e.target.value)} required /></label><button className="primary-wide" disabled={busy}>เข้าสู่ระบบ</button></form> : <>
      <button className="ghost-wide" onClick={() => { setLogged(false); setKey(''); setBarbers([]); }}>ออกจากระบบ</button>
      <h2>{draft.id ? 'แก้ไขช่าง' : 'เพิ่มช่างใหม่'}</h2>
      <form className="form-card" onSubmit={e => { e.preventDefault(); void save(draft); }}>
        <label>ชื่อช่าง<input required maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>ตำแหน่ง / ความถนัด<input maxLength={120} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /></label>
        <label>LINE User ID หรือ Group ID<input placeholder="U... หรือ C... (เว้นว่างใช้กลุ่มสำรอง)" value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value.trim() })} /></label>
        <button className="primary-wide" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกช่าง'}</button>
        {draft.id && <button type="button" className="ghost-wide" onClick={() => setDraft(empty)}>ยกเลิกแก้ไข</button>}
      </form>
      <h2>ช่างทั้งหมด ({barbers.length})</h2>
      {!barbers.length && <p>ยังไม่มีช่าง เพิ่มคนแรกได้จากแบบฟอร์มด้านบน</p>}
      {barbers.map(b => <article className="summary-card" key={b.id}><h3>{b.name} · {b.active ? 'รับคิว' : 'ปิดใช้งาน'}</h3><p>{b.role}</p><p>{b.target ? 'เชื่อม LINE แล้ว' : 'ยังไม่ได้ผูก LINE ส่วนตัว'}</p><button className="ghost-wide" disabled={busy} onClick={() => setDraft(b)}>แก้ไข</button><button className="ghost-wide" disabled={busy} onClick={() => { if (window.confirm(b.active ? 'ปิดรับคิวของช่างนี้? ประวัติและคิวเดิมจะยังอยู่' : 'เปิดรับคิวช่างนี้อีกครั้ง?')) void save({ ...b, active: !b.active }); }}>{b.active ? 'ลบออกจากหน้าจอง' : 'เปิดรับคิวอีกครั้ง'}</button></article>)}
    </>}
    {message && <p role="status" className="demo-banner">{message}</p>}
  </main>;
}
