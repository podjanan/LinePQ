import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRIMLY — จองคิวร้านตัดผม',
  description: 'เลือกบริการ เลือกช่าง และจองเวลาตัดผมผ่าน LINE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
