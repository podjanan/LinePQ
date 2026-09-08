import { readFile } from 'node:fs/promises';

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const liffUrl = process.env.LIFF_URL;
const mapUrl = process.env.MAP_URL || liffUrl;
if (!token || !liffUrl) throw new Error('กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LIFF_URL ก่อน');

const width = 1536; const height = 1024; const cellW = 512; const cellH = 512;
const uri = (view) => ({ type: 'uri', uri: `${liffUrl}${liffUrl.includes('?')?'&':'?'}view=${view}` });
const richMenu = {
  size: { width, height }, selected: true, name: 'TRIMLY white blue', chatBarText: 'เมนูร้าน',
  areas: [
    { bounds:{x:0,y:0,width:cellW,height:cellH}, action:uri('services') },
    { bounds:{x:512,y:0,width:cellW,height:cellH}, action:uri('appointments') },
    { bounds:{x:1024,y:0,width:cellW,height:cellH}, action:uri('services') },
    { bounds:{x:0,y:512,width:cellW,height:cellH}, action:uri('barber') },
    { bounds:{x:512,y:512,width:cellW,height:cellH}, action:{type:'uri',uri:mapUrl} },
    { bounds:{x:1024,y:512,width:cellW,height:cellH}, action:{type:'message',text:'ติดต่อร้าน'} },
  ],
};
const headers = { authorization:`Bearer ${token}`,'content-type':'application/json' };
let response = await fetch('https://api.line.me/v2/bot/richmenu/validate',{method:'POST',headers,body:JSON.stringify(richMenu)});
if(!response.ok) throw new Error(`ตรวจรูปแบบ Rich Menu ไม่ผ่าน: ${await response.text()}`);
response = await fetch('https://api.line.me/v2/bot/richmenu',{method:'POST',headers,body:JSON.stringify(richMenu)});
if(!response.ok) throw new Error(`สร้าง Rich Menu ไม่สำเร็จ: ${await response.text()}`);
const { richMenuId } = await response.json();
const image = await readFile(new URL('../public/rich-menu-white-blue-upload.jpg', import.meta.url));
response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'image/jpeg'},body:image});
if(!response.ok) throw new Error(`อัปโหลดภาพไม่สำเร็จ: ${await response.text()}`);
response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,{method:'POST',headers:{authorization:`Bearer ${token}`}});
if(!response.ok) throw new Error(`ตั้งเป็นเมนูหลักไม่สำเร็จ: ${await response.text()}`);
console.log(`ติดตั้ง Rich Menu สำเร็จ: ${richMenuId}`);
