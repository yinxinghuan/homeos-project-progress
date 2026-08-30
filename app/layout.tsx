import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://homeos-project-progress.yinxinghuan.chatgpt.site'),
  title: 'HomeOS 工程进度',
  description: '面向施工与安装协作的工程进度、型号、尺寸和安装资料看板。',
  openGraph: {
    title: 'HomeOS 工程进度',
    description: '型号 · 尺寸 · 安装 · 验收',
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'HomeOS 工程进度：型号、尺寸、安装与验收' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HomeOS 工程进度',
    description: '型号 · 尺寸 · 安装 · 验收',
    images: ['/og.png'],
  },
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
