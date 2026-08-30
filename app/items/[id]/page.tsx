import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProgressItemPage } from '@/components/progress-item-page';
import { data } from '@/lib/progress';

const siteOrigin = 'https://homeos-project-progress.yinxinghuan.chatgpt.site';

export function generateStaticParams() {
  return data.items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = data.items.find((entry) => entry.id === id);
  if (!item) return {};

  const title = `${item.name} · HomeOS 工程档案`;
  const description = `${[item.brand, item.model].filter(Boolean).join(' · ') || item.category}。${item.progress}。下一步：${item.nextAction}`;
  const firstImage = item.assets.find((asset) => asset.type === 'image');
  const images = firstImage ? [{ url: new URL(firstImage.href.replace(/^\//, ''), `${siteOrigin}/`).toString(), alt: `${item.name}技术资料` }] : [];

  return {
    title,
    description,
    alternates: { canonical: `/items/${item.id}` },
    openGraph: { title, description, type: 'article', url: `/items/${item.id}`, images },
    twitter: { card: images.length ? 'summary_large_image' : 'summary', title, description, images },
  };
}

export default async function ItemRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = data.items.find((entry) => entry.id === id);
  if (!item) notFound();
  return <ProgressItemPage item={item} />;
}
