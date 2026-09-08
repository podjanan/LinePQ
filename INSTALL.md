# คู่มือติดตั้ง TRIMLY บน Vercel + Google Sheets + LINE OA

## เพิ่ม / แก้ไข / ลบช่าง (อัปเดต)

1. ตั้ง `ADMIN_ACCESS_KEY` ใน Vercel เป็นรหัสสุ่มอย่างน้อย 24 ตัวอักษร เก็บเฉพาะเจ้าของร้าน แล้ว Redeploy
2. เปิด `https://ชื่อโปรเจกต์.vercel.app/admin` และใส่รหัสนี้ รหัสเก็บเฉพาะในหน่วยความจำของหน้า ไม่บันทึกใน localStorage
3. กรอกชื่อช่าง ความถนัด และ LINE User ID หรือ Group ID แล้วกดบันทึก
4. ช่างที่เปิดใช้งานจะปรากฏในหน้าจองจาก Google Sheets อัตโนมัติ
5. ปุ่ม “ลบออกจากหน้าจอง” เป็นการปิดรับคิวใหม่ ประวัติและคิวเดิมยังอยู่ ต้องติดต่อจัดการคิวเดิมก่อนช่างหยุดงาน
6. กด “เปิดรับคิวอีกครั้ง” เพื่อคืนรายชื่อช่างได้

การลงทะเบียนผ่านข้อความ LINE ด้านล่างเปลี่ยนเป็นเจ้าของร้านเท่านั้น: ตั้ง `LINE_ADMIN_USER_IDS` เป็น Messaging API User ID ของเจ้าของร้าน (หลายคนคั่นด้วย comma) และใช้รหัสช่างจากชีต คำสั่งไม่สร้างช่างใหม่อีกต่อไป หากไม่ได้ตั้งค่านี้ให้ผูกปลายทางผ่าน `/admin` เท่านั้น ห้ามให้รหัสเจ้าของร้านแก่ลูกค้า

การเพิ่มช่างยังไม่ใช่การตั้งเวลาทำงานหรือวันหยุด รายการเวลาว่างและการป้องกันการจองพร้อมกันยังต้องพัฒนาต่อก่อนเปิดร้านเต็มรูปแบบ

คู่มือนี้พาติดตั้งตั้งแต่ยังไม่มีบัญชีระบบ จนลูกค้าจองคิวผ่าน LINE, ข้อมูลเข้า Google Sheets, ตรวจสลิป และแจ้งเตือนไปยัง LINE ของช่าง

## ภาพรวมระบบ

```text
ลูกค้าเปิด Rich Menu
        ↓
เปิดหน้า LIFF บน Vercel
        ↓
เลือกบริการ → ช่าง → วันเวลา → กรอกเบอร์โทร
        ↓
Vercel บันทึกคิวลง Google Sheets
        ↓
LINE OA แจ้งคิวใหม่ให้ช่าง
        ↓
ลูกค้าโอนเงินและอัปโหลดสลิป
        ↓
SlipOK ตรวจสลิป → บันทึกผล → แจ้งลูกค้าและช่าง
```

ข้อมูลตารางเก็บใน Google Sheets ส่วนไฟล์รูปสลิปเก็บแบบ private ใน Vercel Blob

---

## 1. สิ่งที่ต้องเตรียม

เตรียมบัญชีและข้อมูลต่อไปนี้:

1. บัญชี Google
2. บัญชี GitHub
3. บัญชี Vercel
4. LINE Official Account
5. LINE Developers account
6. SlipOK ที่เปิดใช้ API แล้ว
7. QR Code รับเงินของร้าน
8. ชื่อธนาคาร ชื่อบัญชี และเลขบัญชีรับเงิน

อย่าส่งหรือบันทึกข้อมูลต่อไปนี้ไว้ใน GitHub:

- LINE Channel Secret
- LINE Channel Access Token
- SlipOK API Key
- Google Service Account Private Key
- `BLOB_READ_WRITE_TOKEN`

ไฟล์ `.env*` ถูกตั้งให้ Git ไม่ติดตามอยู่แล้ว แต่ควรตรวจด้วย `git status` ก่อน push ทุกครั้ง

---

## 2. ติดตั้งโปรเจกต์บนเครื่อง

ต้องมี Node.js 22.13 ขึ้นไปและ Git

เปิด PowerShell ที่โฟลเดอร์โปรเจกต์:

```powershell
cd C:\Users\podja\Desktop\project\Line-PQ
npm install
npm run build
```

ผลที่ถูกต้องต้องขึ้น `Compiled successfully` และมี routes เหล่านี้:

```text
/
/api/bookings
/api/config
/api/payments/verify
/api/webhook
```

หาก Git แจ้ง `detected dubious ownership` ให้รันเพียงครั้งเดียว:

```powershell
git config --global --add safe.directory C:/Users/podja/Desktop/project/Line-PQ
```

จากนั้นทดสอบหน้าเว็บในเครื่อง:

```powershell
npm run dev
```

เปิด `http://localhost:3000` หน้าเว็บจะอยู่ในโหมดทดลองจนกว่าจะใส่ Environment Variables ครบ

---

## 3. สร้าง Google Spreadsheet

1. เปิด [Google Sheets](https://sheets.google.com)
2. กด **Blank spreadsheet**
3. ตั้งชื่อ เช่น `TRIMLY Barber Database`
4. ดู URL ตัวอย่าง:

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
```

ค่าระหว่าง `/d/` และ `/edit` คือ Spreadsheet ID:

```text
1AbCdEfGhIjKlMnOpQrStUvWxYz
```

เก็บค่านี้ไว้ใช้เป็น `GOOGLE_SHEET_ID` ไม่ต้องสร้างหัวตารางเอง ระบบจะสร้างแท็บต่อไปนี้ให้อัตโนมัติ:

- `Bookings` — รายการจองทั้งหมด
- `Barbers` — รายชื่อช่างและปลายทาง LINE
- `Services` — บริการ ระยะเวลา และราคา
- `Payments` — ประวัติการตรวจสลิป

สามารถปล่อยแท็บ `Sheet1` เดิมไว้หรือลบภายหลังก็ได้

---

## 4. เปิด Google Sheets API

1. เปิด [Google Cloud Console](https://console.cloud.google.com)
2. กดตัวเลือก Project ด้านบน
3. กด **New Project**
4. ตั้งชื่อ เช่น `trimly-barber`
5. กด **Create** และเลือกโปรเจกต์ที่สร้าง
6. ไปที่ **APIs & Services > Library**
7. ค้นหา `Google Sheets API`
8. เปิดรายการแล้วกด **Enable**

ไม่จำเป็นต้องเปิด Google Drive API สำหรับระบบนี้

---

## 5. สร้าง Google Service Account

1. ใน Google Cloud Console ไปที่ **IAM & Admin > Service Accounts**
2. กด **Create service account**
3. Service account name ใส่ `trimly-sheets`
4. กด **Create and continue**
5. ขั้น Grant access to project สามารถข้ามได้
6. กด **Done**
7. เปิด Service Account ที่เพิ่งสร้าง
8. เปิดแท็บ **Keys**
9. กด **Add key > Create new key**
10. เลือกชนิด **JSON** แล้วกด **Create**

เบราว์เซอร์จะดาวน์โหลดไฟล์ JSON ให้หนึ่งไฟล์ เก็บไฟล์นี้เป็นความลับและห้าม commit เข้า Git

เปิดไฟล์ JSON ด้วยโปรแกรมอ่านข้อความ จะพบค่าที่ต้องใช้:

```json
{
  "client_email": "trimly-sheets@ชื่อโปรเจกต์.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

จับคู่ค่า:

| ตัวแปร Vercel | ค่าจากไฟล์ JSON |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` |
| `GOOGLE_PRIVATE_KEY` | `private_key` ทั้งชุด รวม BEGIN/END |

จากนั้นกลับไป Google Spreadsheet:

1. กด **Share**
2. วางค่า `client_email`
3. เลือกสิทธิ์ **Editor**
4. ปิด Notify people ได้
5. กด **Share**

หากไม่แชร์ชีตให้ Service Account ระบบจะขึ้นข้อผิดพลาด Google Sheets API 403

---

## 6. สร้าง LINE Official Account

หากมี LINE OA อยู่แล้ว ให้ข้ามไปหัวข้อถัดไป

1. เปิด [LINE Official Account Manager](https://manager.line.biz)
2. ล็อกอินด้วยบัญชี LINE
3. กดสร้างบัญชีใหม่
4. ใส่ชื่อร้าน หมวดธุรกิจ และข้อมูลร้าน
5. อัปโหลดรูปโปรไฟล์ร้าน

หลังสร้างแล้วให้เข้า OA Manager และจด Basic ID ของบัญชีไว้สำหรับให้ลูกค้าเพิ่มเพื่อน

---

## 7. เปิด Messaging API

1. เข้า LINE Official Account Manager
2. เลือกบัญชีร้าน
3. ไปที่ **Settings > Messaging API**
4. กด **Enable Messaging API**
5. สร้างหรือเลือก Provider ของร้าน

สำคัญ: Messaging API channel และ LINE Login channel ในขั้นถัดไปต้องอยู่ใน Provider เดียวกัน เพื่อให้ User ID ของลูกค้าอ้างอิงตรงกัน

เปิด [LINE Developers Console](https://developers.line.biz/console/) แล้วเลือก Messaging API channel จากนั้น:

### 7.1 เก็บ Channel Secret

1. เปิดแท็บ **Basic settings**
2. คัดลอก **Channel secret**
3. ใช้เป็น `LINE_CHANNEL_SECRET`

### 7.2 สร้าง Channel Access Token

1. เปิดแท็บ **Messaging API**
2. ไปที่ Channel access token
3. กด **Issue**
4. คัดลอก token
5. ใช้เป็น `LINE_CHANNEL_ACCESS_TOKEN`

### 7.3 อนุญาตให้บอทเข้ากลุ่มช่าง

ในแท็บ Messaging API เปิด **Allow bot to join group chats** หากต้องการให้คิวเด้งในกลุ่ม LINE ของร้าน

---

## 8. สร้าง LINE Login และ LIFF

1. ใน LINE Developers Console เปิด Provider เดียวกับ Messaging API
2. กด **Create a new channel**
3. เลือก **LINE Login**
4. ใส่ชื่อแอป อีเมล และรายละเอียดตามจริง
5. App type เลือก **Web app**
6. สร้าง channel

เปิดแท็บ **Basic settings** แล้วคัดลอก **Channel ID** ใช้เป็น:

```text
LINE_CHANNEL_ID
```

จากนั้นเพิ่ม LIFF app:

1. เปิดแท็บ **LIFF**
2. กด **Add**
3. LIFF app name ใส่ `TRIMLY Booking`
4. Size เลือก **Full**
5. Endpoint URL ให้ใส่ URL Vercel หลัง deploy เช่น `https://trimly-booking.vercel.app`
6. Scopes เลือก `openid` และ `profile`
7. Add friend option เลือก `Normal` หรือ `Aggressive`
8. กด **Add**

คัดลอก LIFF ID เช่น `1234567890-AbCdEfGh` ใช้เป็น `LIFF_ID`

LIFF URL ที่นำไปเปิดจาก Rich Menu คือ:

```text
https://liff.line.me/LIFF_ID
```

ช่วงที่ยังไม่มี URL Vercel สามารถ deploy เว็บก่อน แล้วกลับมาเพิ่ม LIFF และ Environment Variables ภายหลังได้

---

## 9. เตรียม GitHub Repository

สร้าง repository เปล่าบน GitHub เช่น `trimly-line-booking` โดยไม่ต้องเพิ่ม README จากหน้า GitHub หากโปรเจกต์มี Git อยู่แล้ว

จากโฟลเดอร์โปรเจกต์รัน:

```powershell
git status
git add .
git commit -m "Prepare TRIMLY for Vercel and Google Sheets"
git branch -M main
git remote add origin https://github.com/ชื่อผู้ใช้/trimly-line-booking.git
git push -u origin main
```

ถ้ามี remote `origin` อยู่แล้ว ให้ตรวจด้วย:

```powershell
git remote -v
```

และเปลี่ยน URL ด้วย:

```powershell
git remote set-url origin https://github.com/ชื่อผู้ใช้/trimly-line-booking.git
```

---

## 10. Deploy โปรเจกต์บน Vercel

### วิธีผ่านหน้าเว็บ

1. เปิด [Vercel Dashboard](https://vercel.com/dashboard)
2. ล็อกอินด้วย GitHub
3. กด **Add New > Project**
4. เลือก repository `trimly-line-booking`
5. Framework Preset ต้องเป็น **Next.js**
6. Root Directory เป็น `./`
7. Build Command ใช้ค่าปกติ `npm run build`
8. กด **Deploy**

รอบแรกหน้าเว็บเปิดได้ แต่ยังจองจริงไม่ได้จนกว่าจะเพิ่ม Environment Variables

### วิธีผ่าน Vercel CLI

```powershell
npx vercel login
npx vercel link
npx vercel --prod
```

เมื่อ deploy สำเร็จจะได้ URL เช่น:

```text
https://trimly-line-booking.vercel.app
```

เก็บ URL นี้ไว้ใช้กับ LIFF, webhook และ Payment QR URL

---

## 11. สร้าง Vercel Blob สำหรับเก็บสลิป

1. เปิดโปรเจกต์ใน Vercel Dashboard
2. ไปที่แท็บ **Storage**
3. กด **Create Database** หรือ **Create Store**
4. เลือก **Blob**
5. ตั้งชื่อ เช่น `trimly-slips`
6. เลือก Access เป็น **Private**
7. เชื่อม store กับโปรเจกต์

Vercel จะเพิ่ม `BLOB_READ_WRITE_TOKEN` ให้โปรเจกต์อัตโนมัติ ตรวจได้ที่ **Settings > Environment Variables**

ห้ามตั้ง Blob เป็น public เพราะสลิปมีข้อมูลส่วนบุคคลและข้อมูลทางการเงิน

---

## 12. ตั้ง Environment Variables บน Vercel

ไปที่ **Vercel Project > Settings > Environment Variables** แล้วเพิ่มค่าต่อไปนี้

### Google Sheets

| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` จาก JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` ทั้งชุด |

เวลาวาง `GOOGLE_PRIVATE_KEY` สามารถวางแบบหลายบรรทัด หรือแบบที่มี `\n` จาก JSON ได้ ระบบรองรับทั้งสองแบบ

### LINE

| Name | Value |
|---|---|
| `LIFF_ID` | LIFF ID |
| `LINE_CHANNEL_ID` | Channel ID ของ LINE Login |
| `LINE_CHANNEL_SECRET` | Secret ของ Messaging API |
| `LINE_CHANNEL_ACCESS_TOKEN` | Access token ของ Messaging API |
| `LINE_STAFF_GROUP_ID` | ไม่บังคับ ใช้เป็นกลุ่มสำรองสำหรับแจ้งช่าง |

### SlipOK

| Name | Value |
|---|---|
| `SLIPOK_API_KEY` | API Key จาก SlipOK |
| `SLIPOK_BRANCH_ID` | Branch ID จาก SlipOK |

### บัญชีรับเงิน

| Name | ตัวอย่าง |
|---|---|
| `BANK_NAME` | `ธนาคารกสิกรไทย` |
| `BANK_ACCOUNT_NAME` | `นาย ตัวอย่าง ร้านตัดผม` |
| `BANK_ACCOUNT_NUMBER` | `000-0-00000-0` |
| `PAYMENT_QR_URL` | `https://ชื่อโปรเจกต์.vercel.app/payment-qr.png` |

### Vercel Blob

`BLOB_READ_WRITE_TOKEN` จะถูกสร้างจากขั้นตอน Storage ไม่ควรพิมพ์ขึ้นใหม่เอง

เลือก Environment อย่างน้อย **Production** สำหรับทุกตัวแปร ถ้าต้องการทดสอบ Preview และบนเครื่องให้เลือก **Preview** กับ **Development** เพิ่มด้วย

หลังเพิ่มหรือแก้ Environment Variables ต้อง Redeploy เพราะค่าที่แก้จะไม่ย้อนกลับไปใช้กับ deployment เก่า:

1. ไปที่แท็บ **Deployments**
2. เปิดเมนู `...` ของ deployment ล่าสุด
3. กด **Redeploy**

---

## 13. เพิ่ม QR Code ของบัญชีร้าน

1. เตรียมไฟล์ QR Code จริงของบัญชีร้าน
2. เปลี่ยนชื่อเป็น `payment-qr.png`
3. วางไฟล์ที่:

```text
C:\Users\podja\Desktop\project\Line-PQ\public\payment-qr.png
```

4. commit และ push:

```powershell
git add public/payment-qr.png
git commit -m "Add shop payment QR"
git push
```

5. ตั้ง `PAYMENT_QR_URL` เป็น URL แบบ HTTPS ของไฟล์
6. เปิด URL ในเบราว์เซอร์ ต้องเห็น QR Code โดยตรง
7. ทดลองโอนยอดเล็กและตรวจชื่อผู้รับก่อนเปิดร้านจริง

---

## 14. ตั้งค่า SlipOK

1. เข้า SlipOK Dashboard
2. สร้างหรือเลือก Branch ของร้าน
3. ผูกบัญชีผู้รับให้ตรงกับ QR Code ที่แสดงในระบบ
4. เปิด API และคัดลอก Branch ID กับ API Key
5. เพิ่มค่าใน Vercel
6. Redeploy

ระบบส่งยอดมัดจำที่ต้องชำระให้ SlipOK ตรวจด้วย หากยอดผิดหรือใช้สลิปซ้ำ ระบบจะไม่ยืนยันคิว

ก่อนเปิดจริงให้ทดสอบอย่างน้อย:

- สลิปถูกต้องและยอดตรง
- สลิปยอดผิด
- สลิปคนละบัญชีผู้รับ
- สลิปเดิมอัปโหลดซ้ำ
- รูปที่ไม่ใช่สลิป

---

## 15. ตั้ง Webhook ของ LINE

กลับไปที่ LINE Developers Console > Messaging API channel > แท็บ Messaging API

Webhook URL:

```text
https://ชื่อโปรเจกต์.vercel.app/api/webhook
```

ตั้งค่าตามลำดับ:

1. วาง Webhook URL
2. กด **Update**
3. กด **Verify** ต้องขึ้น Success
4. เปิด **Use webhook**
5. เปิด **Webhook redelivery**

หาก Verify ไม่ผ่าน:

1. ตรวจว่า URL ขึ้นต้น `https://`
2. ตรวจว่า deployment ล่าสุดทำงานอยู่
3. ตรวจ `LINE_CHANNEL_SECRET`
4. Redeploy หลังแก้ Environment Variables
5. ดู Vercel > Logs ของ `/api/webhook`

Webhook ใช้รับ event จาก LINE และตรวจลายเซ็นก่อนประมวลผลคำสั่งลงทะเบียนช่าง

---

## 16. ผูก URL Vercel เข้ากับ LIFF

กลับไป LINE Login channel > LIFF > เลือก `TRIMLY Booking`

ตั้ง Endpoint URL เป็น:

```text
https://ชื่อโปรเจกต์.vercel.app
```

ต้องเป็น HTTPS และไม่ควรใส่ `https://liff.line.me/...` ในช่อง Endpoint URL

เปิด LIFF URL จากมือถือผ่าน LINE:

```text
https://liff.line.me/LIFF_ID
```

ตรวจว่าระบบเห็นชื่อโปรไฟล์ LINE ของผู้ใช้และไม่แสดงโหมดทดลอง

---

## 17. ลงทะเบียน LINE ของช่าง

รหัสช่างที่ระบบเตรียมไว้:

| ช่าง | คำสั่ง |
|---|---|
| ช่างนนท์ | `ลงทะเบียนช่าง non` |
| ช่างภูมิ | `ลงทะเบียนช่าง phum` |
| ช่างมิกซ์ | `ลงทะเบียนช่าง mix` |
| กลุ่มรับคิว “ช่างคนไหนก็ได้” | `ลงทะเบียนช่าง any` |

### แจ้งช่างแบบแชตส่วนตัว

1. ให้ช่างเพิ่ม LINE OA ของร้านเป็นเพื่อน
2. ช่างส่งคำสั่งของตัวเองหา OA
3. OA ต้องตอบ `ลงทะเบียน ... สำเร็จ`
4. ระบบบันทึก User ID ลง `Barbers > line_target_id`

### แจ้งคิวในกลุ่ม LINE

1. เปิด Allow bot to join group chats ใน LINE Developers
2. เชิญ LINE OA เข้ากลุ่มช่าง
3. ส่งคำสั่งลงทะเบียนในกลุ่ม
4. ระบบจะบันทึก Group ID แทน User ID
5. คิวของช่างนั้นจะเด้งในกลุ่ม

หากต้องการให้ช่างทุกคนเห็นทุกคิว ให้ใช้ Group ID เดียวกันในคอลัมน์ `line_target_id` ของช่างทุกคน หรือส่งคำสั่งลงทะเบียนแต่ละรหัสในกลุ่มเดียวกัน

เมื่อมีการจอง ช่างจะได้รับข้อความสองช่วง:

```text
มีคิวใหม่ ✂️
สถานะ: รอชำระมัดจำ
ลูกค้า: ...
โทร: ...
บริการ: ...
ช่าง: ...
วันที่ ... เวลา ...
เลขที่ ...
```

และหลังสลิปผ่าน:

```text
ยืนยันชำระเงินแล้ว ✅
ลูกค้า: ...
...
```

หาก OA ตอบว่าลงทะเบียนสำเร็จแต่ไม่มีข้อความคิว ให้ตรวจว่าช่างไม่ได้บล็อก OA และ LINE OA ยังอยู่ในกลุ่มนั้น

---

## 18. ติดตั้ง Rich Menu

ไฟล์พร้อมอัปโหลด:

```text
public/rich-menu-white-blue-upload.jpg
```

ขนาด 1536 × 1024 และต่ำกว่า 1 MB

ตั้งตัวแปรชั่วคราวใน PowerShell แล้วรัน:

```powershell
$env:LINE_CHANNEL_ACCESS_TOKEN='ใส่ Channel Access Token'
$env:LIFF_URL='https://liff.line.me/ใส่-LIFF-ID'
$env:MAP_URL='https://maps.google.com/?q=พิกัดร้าน'
npm run line:setup
```

สคริปต์จะ:

1. ตรวจรูปและ Rich Menu JSON
2. สร้าง Rich Menu ผ่าน Messaging API
3. อัปโหลดรูป
4. ตั้งเป็น Default Rich Menu

หลังรันสำเร็จให้ปิดและเปิดแชต OA ใหม่ หากยังไม่เห็นเมนูให้ลองซ่อน/แสดง Rich Menu หรือรอสักครู่

---

## 19. ตรวจ Google Sheets หลังจอง

เมื่อมีลูกค้าจองครั้งแรก ระบบจะสร้างหัวตารางอัตโนมัติ

### Bookings

คอลัมน์สำคัญ:

- `id` — เลขที่การจอง
- `line_user_id` — User ID ลูกค้า
- `customer_name`, `phone`
- `service_id`, `service_name`
- `barber_id`, `barber_name`
- `appointment_date`, `appointment_time`
- `status`
- `created_at`

สถานะที่พบได้:

- `awaiting_payment` — รอชำระ
- `confirmed` — สลิปผ่านและยืนยันแล้ว
- `expired` — เกินเวลาชำระ 15 นาที
- `cancelled` — ยกเลิก

### Barbers

คอลัมน์ `line_target_id` จะเป็น:

- `U...` เมื่อแจ้งส่วนตัวถึงช่าง
- `C...` เมื่อแจ้งเข้ากลุ่ม
- `R...` เมื่อแจ้งเข้าห้องแชตหลายคน

### Payments

เก็บเลขอ้างอิงธุรกรรม สถานะตรวจสอบ และตำแหน่งไฟล์สลิปใน private Blob ไม่ได้เก็บรูปภาพลงเซลล์โดยตรง

อย่าเปลี่ยนชื่อแท็บหรือหัวคอลัมน์ เพราะ API อ้างอิงชื่อตามนี้

---

## 20. เช็กลิสต์ก่อนเปิดรับลูกค้าจริง

- [ ] `npm run build` ผ่าน
- [ ] Production deployment บน Vercel เปิดได้
- [ ] `/api/config` แสดง `configured: true`
- [ ] Google Spreadsheet แชร์ให้ Service Account เป็น Editor
- [ ] จองแล้วมีแถวใหม่ใน `Bookings`
- [ ] เลือกช่างแล้ว LINE ของช่างเด้ง
- [ ] QR Code เป็นบัญชีของร้านจริง
- [ ] SlipOK ผูกผู้รับถูกต้อง
- [ ] สลิปถูกต้องเปลี่ยนสถานะเป็น `confirmed`
- [ ] สลิปเดิมใช้ซ้ำไม่ได้
- [ ] ลูกค้าได้รับข้อความยืนยันใน LINE
- [ ] ช่างได้รับข้อความยืนยันการชำระ
- [ ] Rich Menu เปิด LIFF URL ถูกต้อง
- [ ] ทดสอบบน LINE ทั้ง Android และ iPhone ถ้ามีอุปกรณ์
- [ ] ร้านกำหนดนโยบายยกเลิก เลื่อนคิว และคืนมัดจำแล้ว

Google Sheets ไม่มี transaction แบบฐานข้อมูล SQL ระบบจึงตรวจคิวซ้ำก่อนเพิ่มแถว ซึ่งเหมาะกับร้านที่ปริมาณจองทั่วไป หากมีลูกค้ากดเวลาเดียวกันจำนวนมากมาก อาจต้องเพิ่ม Google Apps Script `LockService` หรือเปลี่ยนฐานข้อมูลหลักภายหลัง

---

## 21. การแก้ปัญหาที่พบบ่อย

### หน้าเว็บขึ้นโหมดทดลอง

- ตรวจ Environment Variables ให้ครบ
- ตรวจชื่อสะกดและตัวพิมพ์ใหญ่
- Redeploy หลังเพิ่มค่า
- เปิด `/api/config` และดู `configured`

### Google Sheets API 403

- เปิด Google Sheets API แล้วหรือไม่
- แชร์ชีตให้ `GOOGLE_SERVICE_ACCOUNT_EMAIL` เป็น Editor หรือไม่
- `GOOGLE_SHEET_ID` ถูกต้องหรือไม่

### Google authentication failed

- วาง Private Key ครบทั้ง BEGIN และ END
- อย่าเพิ่มเครื่องหมายคำพูดเกินจากค่าจริงใน Vercel UI
- ถ้าคัดลอกจาก JSON ให้คง `\n` ไว้ได้
- หาก key รั่ว ให้ลบ key เดิมใน Google Cloud และสร้างใหม่ทันที

### LINE Verify webhook ไม่ผ่าน

- ตรวจ `LINE_CHANNEL_SECRET` จาก Messaging API channel
- ตรวจ URL `/api/webhook`
- ตรวจ Vercel Function Logs
- Redeploy หลังเปลี่ยน secret

### ช่างไม่รับข้อความ

- ให้ช่างเพิ่ม OA เป็นเพื่อน
- ส่งคำสั่งลงทะเบียนอีกครั้ง
- ตรวจ `Barbers > line_target_id`
- หากเป็นกลุ่ม ให้เปิด Allow bot to join group chats
- ตรวจว่า OA ยังอยู่ในกลุ่ม

### อัปโหลดสลิปไม่ได้

- สร้าง private Vercel Blob แล้วหรือไม่
- ตรวจ `BLOB_READ_WRITE_TOKEN`
- รูปต้องเป็น image และไม่เกิน 10 MB
- ตรวจ Vercel Logs ของ `/api/payments/verify`

### สลิปถูกต้องแต่ถูกปฏิเสธ

- ตรวจยอดมัดจำที่หน้าเว็บ
- ตรวจบัญชีผู้รับที่ผูกกับ SlipOK
- ตรวจ `SLIPOK_BRANCH_ID` และ `SLIPOK_API_KEY`
- ตรวจว่าไม่ใช่สลิปที่ใช้แล้ว

---

## 22. ไฟล์สำคัญของโปรเจกต์

| ไฟล์ | หน้าที่ |
|---|---|
| `app/page.tsx` | หน้าจองคิวทั้งหมด |
| `app/api/bookings/route.ts` | สร้างและอ่านรายการจอง |
| `app/api/payments/verify/route.ts` | อัปโหลดและตรวจสลิป |
| `app/api/webhook/route.ts` | LINE webhook และลงทะเบียนช่าง |
| `lib/google-sheets.ts` | เชื่อม Google Sheets |
| `lib/line-server.ts` | ตรวจตัวตนและส่ง LINE message |
| `scripts/setup-line.mjs` | ติดตั้ง Rich Menu |
| `.env.example` | รายการ Environment Variables |
| `public/rich-menu-white-blue-upload.jpg` | รูป Rich Menu พร้อมอัปโหลด |

เมื่อเปลี่ยนโค้ดและต้องการขึ้น Production:

```powershell
npm run build
git add .
git commit -m "Update booking system"
git push
```

Vercel จะ deploy จาก branch `main` อัตโนมัติหากเชื่อม GitHub repository แล้ว
