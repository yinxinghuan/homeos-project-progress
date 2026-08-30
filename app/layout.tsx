import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HomeOS 工程进度',
  description: '面向施工与安装协作的工程进度、型号、尺寸和安装资料看板。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
