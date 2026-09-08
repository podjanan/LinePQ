'use client';

import Image from 'next/image';
import {
  ArrowLeft, BadgeCheck, Banknote, CalendarDays, Check, ChevronRight,
  CircleHelp, Clock3, Copy, CreditCard, Home, MapPin, MessageCircle,
  Phone, Scissors, ShieldCheck, Sparkles, TicketCheck, Upload, UserRound,
} from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

type Screen = 'home' | 'services' | 'barber' | 'schedule' | 'checkout' | 'payment' | 'success' | 'appointments' | 'profile';
type PublicConfig = { liffId: string; bankName: string; accountName: string; accountNumber: string; paymentQrUrl: string; configured: boolean };
type LiffClient = { init(config: { liffId: string; withLoginOnExternalBrowser?: boolean }): Promise<void>; isLoggedIn(): boolean; login(): void; getIDToken(): string | null; getProfile(): Promise<{ displayName: string; pictureUrl?: string }> };

declare global { interface Window { liff?: LiffClient } }

const services = [
  { id: 'cut', name: 'ตัดผมชาย', detail: 'สระ · ตัด · เซ็ตทรง', duration: 60, price: 350, tag: 'ยอดนิยม' },
  { id: 'cut-shave', name: 'ตัด + โกนหนวด', detail: 'ตัดผมและดูแลหนวดครบชุด', duration: 75, price: 450, tag: 'คุ้มที่สุด' },
  { id: 'perm', name: 'ดัดวอลลุ่มชาย', detail: 'ออกแบบทรงและดัดวอลลุ่ม', duration: 120, price: 1200, tag: 'แนะนำ' },
  { id: 'color', name: 'ทำสีแฟชั่น', detail: 'ฟอก · ลงสี · บำรุง', duration: 180, price: 1800, tag: 'ราคาเริ่มต้น' },
];

const barbers = [
  { id: 'non', name: 'ช่างนนท์', role: 'Master Barber', skill: 'เฟด · ครอป · ออกแบบทรง', initial: 'น', tone: 'lime', next: '13:30' },
  { id: 'phum', name: 'ช่างภูมิ', role: 'Senior Barber', skill: 'ทรงเกาหลี · ดัดวอลลุ่ม', initial: 'ภ', tone: 'orange', next: '14:00' },
  { id: 'mix', name: 'ช่างมิกซ์', role: 'Barber', skill: 'คลาสสิก · รองทรง', initial: 'ม', tone: 'blue', next: '15:30' },
  { id: 'any', name: 'ช่างคนไหนก็ได้', role: 'ได้คิวเร็วที่สุด', skill: 'ระบบเลือกช่างที่ว่างให้คุณ', initial: '⚡', tone: 'silver', next: '12:30' },
];

const dates = [
  { day: 'วันนี้', date: '9', full: '9 ก.ย.' }, { day: 'พฤ.', date: '10', full: '10 ก.ย.' },
  { day: 'ศ.', date: '11', full: '11 ก.ย.' }, { day: 'ส.', date: '12', full: '12 ก.ย.' },
  { day: 'อา.', date: '13', full: '13 ก.ย.' }, { day: 'จ.', date: '14', full: '14 ก.ย.' },
];
const times = ['10:00', '10:30', '11:30', '12:30', '13:30', '14:00', '15:30', '16:00', '17:30', '18:00'];

export default function HomePage() {
  const [liveBarbers, setLiveBarbers] = useState<typeof barbers>([]);
  const [barberError, setBarberError] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [serviceId, setServiceId] = useState('cut');
  const [barberId, setBarberId] = useState('non');
  const [dateIndex, setDateIndex] = useState(0);
  const [time, setTime] = useState('13:30');
  const [slip, setSlip] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [lineIdToken, setLineIdToken] = useState('');
  const [customerName, setCustomerName] = useState('ลูกค้า');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [config, setConfig] = useState<PublicConfig>({ liffId:'', bankName:'ธนาคารของร้าน', accountName:'ชื่อบัญชีร้าน', accountNumber:'กรุณาตั้งค่าเลขบัญชี', paymentQrUrl:'', configured:false });

  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const barber = liveBarbers.find((item) => item.id === barberId) ?? barbers[0];
  const deposit = Math.min(300, service.price);

  const startBooking = () => setScreen('services');
  const chooseService = (id: string) => { setServiceId(id); setScreen('barber'); };
  const chooseBarber = (id: string) => { setBarberId(id); setScreen('schedule'); };
  const navTo = (next: Screen) => setScreen(next);

  const backMap: Partial<Record<Screen, Screen>> = {
    services: 'home', barber: 'services', schedule: 'barber', checkout: 'schedule', payment: 'checkout', success: 'home',
  };

  const onSlip = (event: ChangeEvent<HTMLInputElement>) => { const file=event.target.files?.[0]??null; setSlipFile(file); setSlip(file?.name ?? ''); setErrorMessage(''); };
  const verifySlip = async () => {
    if (!slipFile) return;
    setChecking(true);
    setErrorMessage('');
    if (!config.configured || !lineIdToken || bookingId.startsWith('DEMO')) { window.setTimeout(() => { setChecking(false); setScreen('success'); }, 1200); return; }
    try { const body=new FormData(); body.set('bookingId',bookingId); body.set('slip',slipFile); const response=await fetch('/api/payments/verify',{method:'POST',headers:{authorization:`Bearer ${lineIdToken}`},body}); const result=await response.json() as {error?:string}; if(!response.ok) throw new Error(result.error||'ตรวจสอบสลิปไม่สำเร็จ'); setScreen('success'); } catch(error) { setErrorMessage(error instanceof Error?error.message:'ตรวจสอบสลิปไม่สำเร็จ'); } finally { setChecking(false); }
  };

  const createBooking = async () => {
    setSubmitting(true); setErrorMessage('');
    if (!config.configured || !lineIdToken) { setBookingId(`DEMO-${Date.now()}`); setScreen('payment'); setSubmitting(false); return; }
    try { const date=new Date(); date.setDate(date.getDate()+dateIndex); const localDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; const response=await fetch('/api/bookings',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${lineIdToken}`},body:JSON.stringify({serviceId,barberId,date:localDate,time,customerName,phone})}); const result=await response.json() as {id?:string;error?:string}; if(!response.ok||!result.id) throw new Error(result.error||'สร้างการจองไม่สำเร็จ'); setBookingId(result.id); setScreen('payment'); } catch(error) { setErrorMessage(error instanceof Error?error.message:'สร้างการจองไม่สำเร็จ'); } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (screen !== 'barber') return;
    let active = true;
    setLiveBarbers([]); setBarberError('');
    fetch('/api/barbers', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('โหลดรายชื่อช่างไม่สำเร็จ กรุณาย้อนกลับแล้วลองใหม่');
      const result = await response.json();
      if (active) { setLiveBarbers(result.barbers); if (!result.barbers.length) setBarberError('ยังไม่มีช่างเปิดรับคิว กรุณาติดต่อร้าน'); }
    }).catch(e => { if (active) setBarberError(e.message); });
    return () => { active = false; };
  }, [screen]);

  useEffect(() => {
    let active=true;
    void (async()=>{ try { const response=await fetch('/api/config'); const value=await response.json() as PublicConfig; if(!active)return; setConfig(value); const view=new URLSearchParams(location.search).get('view') as Screen|null; if(view&&['appointments','services','barber'].includes(view)) setScreen(view); if(!value.liffId)return; const start=async()=>{ await window.liff?.init({liffId:value.liffId,withLoginOnExternalBrowser:true}); if(!window.liff?.isLoggedIn()){window.liff?.login();return;} setLineIdToken(window.liff.getIDToken()??''); const profile=await window.liff.getProfile(); setCustomerName(profile.displayName); }; const script=document.createElement('script'); script.src='https://static.line-scdn.net/liff/edge/2/sdk.js'; script.async=true; script.onload=()=>void start(); document.head.appendChild(script); } catch { /* Keep the clearly marked demo mode available. */ } })();
    return()=>{active=false;};
  },[]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const allowedServices = services.map((item) => item.id);
    const allowedBarbers = barbers.map((item) => item.id);
    void Promise.resolve(context.registerTool({
      name: 'prepare_barber_booking',
      title: 'เตรียมการจองคิวตัดผม',
      description: 'เลือกบริการ ช่าง วัน และเวลา แล้วเปิดหน้าตรวจสอบการจองให้ผู้ใช้ยืนยันก่อนชำระเงิน',
      inputSchema: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', enum: allowedServices },
          barberId: { type: 'string', enum: allowedBarbers },
          dateIndex: { type: 'integer', minimum: 0, maximum: dates.length - 1 },
          time: { type: 'string', enum: times },
        },
        required: ['serviceId', 'barberId', 'dateIndex', 'time'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const value = input as { serviceId?: string; barberId?: string; dateIndex?: number; time?: string };
        if (!value || !allowedServices.includes(value.serviceId ?? '') || !allowedBarbers.includes(value.barberId ?? '') || !Number.isInteger(value.dateIndex) || value.dateIndex! < 0 || value.dateIndex! >= dates.length || !times.includes(value.time ?? '')) throw new Error('ข้อมูลการจองไม่ถูกต้อง');
        setServiceId(value.serviceId!); setBarberId(value.barberId!); setDateIndex(value.dateIndex!); setTime(value.time!); setScreen('checkout');
        return { status: 'ready_for_confirmation', serviceId: value.serviceId, barberId: value.barberId, date: dates[value.dateIndex!].full, time: value.time };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const content = (() => {
    if (screen === 'home') return <HomeView onBook={startBooking} onAppointments={() => navTo('appointments')} live={config.configured} />;
    if (screen === 'services') return <ServicesView selected={serviceId} onSelect={chooseService} />;
    if (screen === 'barber') return <>{barberError && <p role="alert" className="error-message">{barberError}</p>}<BarberView barbers={liveBarbers} selected={barberId} onSelect={chooseBarber} /></>;
    if (screen === 'schedule') return <ScheduleView barber={barber} dateIndex={dateIndex} time={time} onDate={setDateIndex} onTime={setTime} onNext={() => setScreen('checkout')} />;
    if (screen === 'checkout') return <CheckoutView service={service} barber={barber} date={dates[dateIndex].full} time={time} deposit={deposit} customerName={customerName} phone={phone} submitting={submitting} error={errorMessage} onName={setCustomerName} onPhone={setPhone} onNext={createBooking} />;
    if (screen === 'payment') return <PaymentView amount={deposit} slip={slip} checking={checking} config={config} error={errorMessage} onSlip={onSlip} onVerify={verifySlip} />;
    if (screen === 'success') return <SuccessView service={service} barber={barber} date={dates[dateIndex].full} time={time} onAppointments={() => setScreen('appointments')} />;
    if (screen === 'appointments') return <AppointmentsView onBook={startBooking} token={lineIdToken} live={config.configured} />;
    return <ProfileView />;
  })();

  const hideNav = ['services', 'barber', 'schedule', 'checkout', 'payment', 'success'].includes(screen);
  return (
    <main className="app-shell">
      {backMap[screen] ? <PageTop title={pageTitle(screen)} onBack={() => setScreen(backMap[screen]!)} /> : screen !== 'success' && <BrandTop name={customerName} />}
      {content}
      {!hideNav && <BottomNav screen={screen} onNav={navTo} />}
    </main>
  );
}

function BrandTop({name}:{name:string}) {
  return <header className="topbar"><div className="brand-mark"><Scissors size={18}/></div><div><p className="eyebrow">TRIMLY BARBERSHOP</p><h1>สวัสดีครับ {name}</h1></div><button className="profile" aria-label="โปรไฟล์">{name.slice(0,1)}</button></header>;
}

function PageTop({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="page-top"><button onClick={onBack} aria-label="ย้อนกลับ"><ArrowLeft/></button><strong>{title}</strong><span /></header>;
}

function Step({ current }: { current: number }) {
  return <div className="steps" aria-label={`ขั้นตอนที่ ${current} จาก 4`}>{[1,2,3,4].map((n) => <span key={n} className={n <= current ? 'done' : ''} />)}</div>;
}

function HomeView({ onBook, onAppointments, live }: { onBook: () => void; onAppointments: () => void; live:boolean }) {
  return <>
    {!live&&<div className="demo-banner"><CircleHelp/>โหมดทดลอง — ใส่ค่า LINE, บัญชี และ SlipOK ก่อนเปิดรับคิวจริง</div>}
    <section className="hero-card">
      <Image src="/barbershop-hero.png" alt="บรรยากาศร้านตัดผม TRIMLY" fill priority sizes="(max-width: 640px) 100vw, 520px" />
      <div className="hero-shade"/><div className="hero-copy"><span className="hero-status"><span className="open-dot"/>เปิดวันนี้ · รับคิวถึง 20:00</span><h2>เลือกช่างที่ใช่<br/>ในเวลาของคุณ</h2><button onClick={onBook}>จองคิวตอนนี้ <ChevronRight size={18}/></button></div>
    </section>
    <section className="quick-grid" aria-label="เมนูลัด">
      <button onClick={onBook}><Scissors/><span>จองคิว</span><small>เลือกช่างและเวลา</small></button>
      <button onClick={onAppointments}><TicketCheck/><span>คิวของฉัน</span><small>ติดตามสถานะ</small></button>
      <button><MessageCircle/><span>แชตร้าน</span><small>สอบถามได้ทันที</small></button>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">POPULAR PICKS</p><h2>บริการยอดนิยม</h2></div><button className="text-button" onClick={onBook}>ดูทั้งหมด</button></div>
      <div className="service-list">{services.slice(0,2).map((item,index) => <article className="service-card" key={item.id}><div className="service-icon"><span>0{index+1}</span><Scissors size={22}/></div><div className="service-info"><h3>{item.name}</h3><p>{item.detail}</p><small><Clock3 size={14}/> {item.duration} นาที</small></div><div className="service-price"><strong>฿{item.price}</strong><button onClick={onBook} aria-label={`เลือก${item.name}`}><ChevronRight size={18}/></button></div></article>)}</div>
    </section>
    <section className="next-slot"><div className="date-box"><CalendarDays size={20}/><strong>วันนี้</strong></div><div><p>คิวว่างเร็วที่สุด</p><strong>12:30 น. · เลือกช่างอัตโนมัติ</strong></div><button onClick={onBook}>เลือก</button></section>
  </>;
}

function ServicesView({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return <section className="flow"><Step current={1}/><div className="flow-intro"><p className="eyebrow">STEP 01</p><h2>วันนี้อยากทำอะไรครับ?</h2><p>เลือกบริการก่อน แล้วเราจะแสดงช่างและเวลาที่ว่างให้</p></div><div className="choice-list">{services.map((item,index) => <button className={`choice-card ${selected===item.id?'selected':''}`} onClick={() => onSelect(item.id)} key={item.id}><div className="number">0{index+1}</div><div><span className="tag">{item.tag}</span><h3>{item.name}</h3><p>{item.detail}</p><small><Clock3 size={14}/> {item.duration} นาที</small></div><div className="choice-end"><strong>฿{item.price.toLocaleString()}</strong><ChevronRight/></div></button>)}</div></section>;
}

function BarberView({ barbers, selected, onSelect }: { barbers: {id:string;name:string;role:string;skill:string;initial:string;tone:string;next:string}[]; selected: string; onSelect: (id: string) => void }) {
  return <section className="flow"><Step current={2}/><div className="flow-intro"><p className="eyebrow">STEP 02</p><h2>เลือกช่างที่ใช่</h2><p>ดูความถนัดและคิวว่างล่าสุดของช่างแต่ละคน</p></div><div className="barber-list">{barbers.map((item) => <button className={`barber-card ${selected===item.id?'selected':''}`} onClick={() => onSelect(item.id)} key={item.id}><div className={`barber-avatar ${item.tone}`}>{item.initial}</div><div><div className="online"><span/>{item.next==='12:30'?'เร็วที่สุด':'ว่าง '+item.next+' น.'}</div><h3>{item.name}</h3><p>{item.role}</p><small>{item.skill}</small></div><ChevronRight className="barber-arrow"/></button>)}</div></section>;
}

function ScheduleView({ barber, dateIndex, time, onDate, onTime, onNext }: { barber: typeof barbers[number]; dateIndex: number; time: string; onDate: (n:number)=>void; onTime:(v:string)=>void; onNext:()=>void }) {
  return <section className="flow with-action"><Step current={3}/><div className="flow-intro"><p className="eyebrow">STEP 03</p><h2>เลือกวันและเวลา</h2><p>เวลาที่เห็นคือคิวว่างล่าสุดของ {barber.name}</p></div>
    <div className="selected-barber"><div className={`barber-avatar small ${barber.tone}`}>{barber.initial}</div><div><small>ช่างที่เลือก</small><strong>{barber.name}</strong></div><BadgeCheck/></div>
    <div className="date-row">{dates.map((item,index) => <button key={item.full} onClick={()=>onDate(index)} className={dateIndex===index?'selected':''}><span>{item.day}</span><strong>{item.date}</strong></button>)}</div>
    <div className="time-head"><h3>เวลาว่าง</h3><span><i/> อัปเดตล่าสุด</span></div><div className="time-grid">{times.map((item,index)=><button key={item} disabled={[1,6].includes(index)} onClick={()=>onTime(item)} className={time===item?'selected':''}>{item}</button>)}</div>
    <div className="sticky-action"><div><small>วันที่เลือก</small><strong>{dates[dateIndex].full} · {time} น.</strong></div><button onClick={onNext}>ดำเนินการต่อ <ChevronRight/></button></div>
  </section>;
}

function CheckoutView({ service, barber, date, time, deposit, customerName, phone, submitting, error, onName, onPhone, onNext }: { service: typeof services[number]; barber: typeof barbers[number]; date:string; time:string; deposit:number; customerName:string; phone:string; submitting:boolean; error:string; onName:(v:string)=>void; onPhone:(v:string)=>void; onNext:()=>void }) {
  return <section className="flow with-action"><Step current={4}/><div className="flow-intro"><p className="eyebrow">CHECKOUT</p><h2>ตรวจสอบการจอง</h2><p>กรอกข้อมูลติดต่อและเช็กรายละเอียดก่อนชำระเงิน</p></div>
    <div className="summary-card"><div className="summary-date"><CalendarDays/><div><small>วันและเวลา</small><strong>{date} · {time} น.</strong></div></div><hr/><dl><div><dt>บริการ</dt><dd>{service.name}</dd></div><div><dt>ช่าง</dt><dd>{barber.name}</dd></div><div><dt>ระยะเวลา</dt><dd>{service.duration} นาที</dd></div><div><dt>ราคาบริการ</dt><dd>฿{service.price.toLocaleString()}</dd></div></dl></div>
    <div className="form-card"><label>ชื่อผู้จอง<input value={customerName} onChange={(e)=>onName(e.target.value)}/></label><label>เบอร์โทรศัพท์<input inputMode="tel" value={phone} onChange={(e)=>onPhone(e.target.value)} placeholder="08X XXX XXXX"/></label><p><ShieldCheck/> ข้อมูลนี้ใช้สำหรับยืนยันและแจ้งเตือนคิวเท่านั้น</p></div>
    {error&&<p className="error-message">{error}</p>}
    <div className="policy-note"><CircleHelp/><p><strong>เงื่อนไขการจอง</strong><br/>ชำระมัดจำภายใน 15 นาที เลื่อนคิวได้ 1 ครั้งก่อนเวลานัดอย่างน้อย 3 ชั่วโมง</p></div>
    <div className="sticky-action"><div><small>ยอดมัดจำ</small><strong className="money">฿{deposit.toLocaleString()}</strong></div><button disabled={!phone||submitting} onClick={onNext}>{submitting?'กำลังจอง...':'ไปชำระเงิน'} {!submitting&&<ChevronRight/>}</button></div>
  </section>;
}

function PaymentView({ amount, slip, checking, config, error, onSlip, onVerify }: { amount:number; slip:string; checking:boolean; config:PublicConfig; error:string; onSlip:(e:ChangeEvent<HTMLInputElement>)=>void; onVerify:()=>void }) {
  const copy = () => navigator.clipboard?.writeText(config.accountNumber);
  return <section className="flow payment with-action">{!config.configured&&<div className="demo-banner"><CircleHelp/>หน้าทดลอง ห้ามโอนเงินจริงจนกว่าจะใส่บัญชีร้าน</div>}<div className="payment-timer"><Clock3/><span>กรุณาชำระภายใน</span><strong>14:32</strong></div><div className="flow-intro centered"><p className="eyebrow">BANK TRANSFER</p><h2>โอนเงินมัดจำ</h2><p>ระบบจะตรวจสอบยอดและข้อมูลในสลิปให้อัตโนมัติ</p></div>
    <div className="amount-box"><small>ยอดที่ต้องชำระ</small><strong>฿{amount.toLocaleString()}.00</strong><span>กรุณาโอนยอดตรงตามที่ระบุ</span></div>
    {config.paymentQrUrl&&<div className="payment-qr"><Image src={config.paymentQrUrl} alt="QR Code สำหรับชำระเงินเข้าบัญชีร้าน" width={180} height={180} unoptimized/><small>สแกนเพื่อชำระเงิน</small></div>}
    <div className="bank-card"><div className="bank-logo"><Banknote/></div><div><small>{config.bankName}</small><strong>{config.accountNumber}</strong><p>{config.accountName}</p></div><button onClick={copy} aria-label="คัดลอกเลขบัญชี"><Copy/></button></div>
    <label className={`upload-box ${slip?'has-file':''}`}><input type="file" accept="image/*" onChange={onSlip}/>{slip?<><BadgeCheck/><strong>แนบสลิปแล้ว</strong><span>{slip}</span><small>แตะเพื่อเปลี่ยนรูป</small></>:<><Upload/><strong>อัปโหลดสลิป</strong><span>รองรับ JPG, PNG ขนาดไม่เกิน 10 MB</span><small>เลือกรูปจากเครื่อง</small></>}</label>
    <ul className="verify-list"><li><Check/> ตรวจชื่อบัญชีผู้รับและยอดเงิน</li><li><Check/> ตรวจวัน เวลา และเลขอ้างอิงไม่ให้ใช้ซ้ำ</li></ul>
    {error&&<p className="error-message">{error}</p>}
    <div className="sticky-action single"><button disabled={!slip||checking} onClick={onVerify}>{checking?'กำลังตรวจสอบสลิป...':'ยืนยันและตรวจสอบสลิป'} {!checking&&<ShieldCheck/>}</button></div>
  </section>;
}

function SuccessView({ service, barber, date, time, onAppointments }: { service:typeof services[number]; barber:typeof barbers[number]; date:string; time:string; onAppointments:()=>void }) {
  return <section className="success"><div className="success-mark"><Check/></div><p className="eyebrow">PAYMENT VERIFIED</p><h1>จองคิวสำเร็จ!</h1><p>สลิปผ่านการตรวจสอบแล้ว<br/>เราส่งรายละเอียดเข้าแชต LINE ให้คุณเรียบร้อย</p><div className="ticket"><div className="ticket-top"><span>TRIMLY</span><strong>#TM260909-013</strong></div><div className="ticket-time"><small>{date}</small><strong>{time}</strong><span>น.</span></div><dl><div><dt>บริการ</dt><dd>{service.name}</dd></div><div><dt>ช่าง</dt><dd>{barber.name}</dd></div><div><dt>สถานะ</dt><dd className="confirmed"><span/>ยืนยันแล้ว</dd></div></dl></div><button className="primary-wide" onClick={onAppointments}>ดูคิวของฉัน <TicketCheck/></button><button className="ghost-wide">เพิ่มลงปฏิทิน <CalendarDays/></button></section>;
}

function AppointmentsView({ onBook, token, live }: { onBook:()=>void; token:string; live:boolean }) {
  const [records,setRecords]=useState<Array<Record<string,unknown>>>([]);
  const [loaded,setLoaded]=useState(!live);
  useEffect(()=>{ if(!live||!token)return; void (async()=>{ try { const response=await fetch('/api/bookings',{headers:{authorization:`Bearer ${token}`}}); const value=await response.json() as {bookings?:Array<Record<string,unknown>>}; setRecords(value.bookings??[]); } finally { setLoaded(true); } })(); },[live,token]);
  const record=records[0];
  const date=record?String(record.appointment_date):'2026-09-09'; const parts=date.split('-');
  const serviceName=record?String(record.service_name):'ตัดผมชาย'; const barberName=record?String(record.barber_name):'ช่างนนท์'; const appointmentTime=record?String(record.appointment_time):'13:30'; const status=record?String(record.status):'confirmed';
  return <section className="page-content"><div className="page-title"><p className="eyebrow">MY APPOINTMENTS</p><h2>คิวของฉัน</h2></div><div className="status-tabs"><button className="active">กำลังจะถึง</button><button>ประวัติ</button></div>{!loaded?<div className="loading-card">กำลังโหลดคิว...</div>:live&&records.length===0?<div className="loading-card">ยังไม่มีคิวที่จองไว้</div>:<article className="appointment-card"><div className="appointment-status"><span/> {status==='confirmed'?'ยืนยันแล้ว':'รอตรวจสอบการชำระเงิน'} <small>#{record?String(record.id):'TM260909-013'}</small></div><div className="appointment-main"><div className="calendar-leaf"><span>นัดหมาย</span><strong>{parts[2]}</strong></div><div><h3>{serviceName}</h3><p><Clock3/> {appointmentTime} น.</p><p><UserRound/> {barberName}</p></div></div><div className="appointment-actions"><button><MapPin/> แผนที่</button><button><MessageCircle/> ติดต่อร้าน</button><button className="more">···</button></div><p className="arrival"><Sparkles/> กรุณามาถึงก่อนเวลานัด 10 นาที</p></article>}<button className="primary-wide" onClick={onBook}>จองคิวเพิ่ม <Scissors/></button></section>;
}

function ProfileView() {
  return <section className="page-content"><div className="profile-head"><div className="big-profile">J</div><h2>เจ เจริญทรง</h2><p>สมาชิก TRIMLY · 4 ครั้ง</p></div><div className="member-card"><div><p>TRIMLY MEMBER</p><h3>อีก 1 ครั้ง รับส่วนลด ฿100</h3></div><div className="stamp-row">{[1,2,3,4,5].map(n=><span className={n<5?'filled':''} key={n}>{n<5?<Check/>:n}</span>)}</div></div><div className="menu-card"><button><Phone/><span><strong>ข้อมูลติดต่อ</strong><small>081 234 5678</small></span><ChevronRight/></button><button><CreditCard/><span><strong>การชำระเงิน</strong><small>ประวัติและใบเสร็จ</small></span><ChevronRight/></button><button><MapPin/><span><strong>สาขาและเวลาเปิด</strong><small>สุขุมวิท 49 · 10:00–20:00</small></span><ChevronRight/></button><button><CircleHelp/><span><strong>ช่วยเหลือ</strong><small>เงื่อนไขและคำถามที่พบบ่อย</small></span><ChevronRight/></button></div></section>;
}

function BottomNav({ screen, onNav }: { screen:Screen; onNav:(s:Screen)=>void }) {
  const items = [{s:'home' as Screen,l:'หน้าหลัก',I:Home},{s:'services' as Screen,l:'จองคิว',I:Scissors},{s:'appointments' as Screen,l:'คิวของฉัน',I:TicketCheck},{s:'profile' as Screen,l:'โปรไฟล์',I:UserRound}];
  return <nav className="bottom-nav" aria-label="เมนูหลัก">{items.map(({s,l,I})=><button key={s} onClick={()=>onNav(s)} className={screen===s?'active':''}><I/><span>{l}</span></button>)}</nav>;
}

function pageTitle(screen: Screen) {
  return ({services:'เลือกบริการ',barber:'เลือกช่าง',schedule:'เลือกเวลา',checkout:'สรุปการจอง',payment:'ชำระเงิน',success:'สำเร็จ'} as Partial<Record<Screen,string>>)[screen] ?? '';
}
