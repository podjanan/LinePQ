# คู่มือติดตั้ง TRIMLY เป็น LINE LIFF

## สิ่งที่ต้องเตรียม

1. LINE Official Account ที่เปิดใช้ Messaging API แล้ว
2. LINE Developers Provider และ LINE Login channel ที่เชื่อมกับ OA เดียวกัน
3. บัญชี SlipOK แบบ API พร้อม `Branch ID` และ `API Key`
4. รูป QR รับเงินของบัญชีร้าน และข้อมูลชื่อธนาคาร ชื่อบัญชี เลขบัญชี

> ห้ามส่ง Channel Secret, Access Token หรือ SlipOK API Key ในแชตสาธารณะ ให้เก็บเป็น secret ของระบบเท่านั้น

## 1. สร้าง LIFF

ใน LINE Developers Console เปิด LINE Login channel แล้วเพิ่ม LIFF app:

- Size: `Full`
- Endpoint URL: `https://trimly-barber-booking.s6704062611174.chatgpt.site`
- Scopes: `openid`, `profile`
- Add friend option: `Aggressive` หรือ `Normal`

คัดลอก LIFF ID และ URL รูปแบบ `https://liff.line.me/{LIFF_ID}` ไว้ใช้ในขั้นตอนถัดไป

## 2. ตั้งค่าระบบ

นำตัวแปรใน `.env.example` ไปตั้งเป็น Environment Variables/Secrets ของเว็บ แล้วเผยแพร่ใหม่:

- `LIFF_ID`, `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- `SLIPOK_API_KEY`, `SLIPOK_BRANCH_ID`
- `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`
- `PAYMENT_QR_URL` เป็น HTTPS URL ของ QR รับเงินจริง

Webhook URL สำหรับ Messaging API คือ:

`https://trimly-barber-booking.s6704062611174.chatgpt.site/api/webhook`

เปิด `Use webhook` และ `Webhook redelivery` ใน LINE Developers Console

## 3. ตั้งค่าบัญชีรับเงินและ SlipOK

1. ผูกบัญชีธนาคารผู้รับใน SlipOK ให้ตรงกับ QR ของร้าน
2. ตั้ง `SLIPOK_BRANCH_ID` และ `SLIPOK_API_KEY`
3. ระบบส่ง `amount` และ `log=true` เพื่อเช็กยอด ผู้รับ และสลิปซ้ำ
4. ทดสอบด้วยยอดเล็กก่อนเปิดรับลูกค้าจริง

ระบบจะไม่ยืนยันคิวจนกว่าสลิปจะผ่าน จากนั้นเปลี่ยนสถานะเป็น `confirmed` และส่งข้อความยืนยันเข้า LINE

## 4. ติดตั้ง Rich Menu

ไฟล์พร้อมอัปโหลดคือ `public/rich-menu-white-blue-upload.jpg` ขนาด 1536×1024 และต่ำกว่า 1 MB

ตั้งค่าตัวแปรใน PowerShell แล้วรัน:

```powershell
$env:LINE_CHANNEL_ACCESS_TOKEN='ใส่โทเค็นของ Messaging API'
$env:LIFF_URL='https://liff.line.me/ใส่-LIFF-ID'
$env:MAP_URL='ลิงก์ Google Maps ของร้าน'
npm run line:setup
```

สคริปต์จะตรวจ JSON, สร้าง Rich Menu, อัปโหลดรูป และตั้งเป็นเมนูเริ่มต้นให้โดยอัตโนมัติ

## 5. เช็กลิสต์ก่อนเปิดจริง

- เปิด LIFF URL จากมือถือ LINE และเห็นชื่อโปรไฟล์จริง
- ทดลองจองสองเครื่องในเวลาเดียวกัน ต้องมีเพียงรายการเดียวที่สำเร็จ
- สลิปยอดผิด บัญชีผิด และสลิปซ้ำต้องถูกปฏิเสธ
- สลิปถูกต้องต้องเปลี่ยนสถานะคิวและได้รับข้อความ LINE
- ตรวจ QR และเลขบัญชีด้วยการโอนยอดเล็ก
- ตรวจข้อความนโยบายเลื่อนคิว/คืนมัดจำให้ตรงกับร้าน
