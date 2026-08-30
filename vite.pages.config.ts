import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const pagesOrigin = 'https://yinxinghuan.github.io/homeos-project-progress';

type StaticItem = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  progress: string;
  nextAction: string;
  assets: { href: string; type: 'pdf' | 'image' }[];
};

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function compactDescription(value: string, limit = 150) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function replaceMeta(html: string, item: StaticItem) {
  const title = `${item.name} · HomeOS 工程档案`;
  const description = compactDescription(`${[item.brand, item.model].filter(Boolean).join(' · ') || item.category}。${item.progress}。下一步：${item.nextAction}`);
  const canonical = `${pagesOrigin}/items/${item.id}/`;
  const firstImage = item.assets.find((asset) => asset.type === 'image');
  const image = firstImage ? `${pagesOrigin}/${firstImage.href.replace(/^\//, '')}` : null;

  let output = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, '<meta property="og:type" content="article" />')
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<link rel="icon" href="[^"]*"\s*\/?>/, '<link rel="icon" href="/homeos-project-progress/favicon.svg" />');

  if (image) {
    output = output
      .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${image}" />`)
      .replace(/<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/, `<meta property="og:image:secure_url" content="${image}" />`)
      .replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${image}" />`);
    output = output
      .replace(/\s*<meta property="og:image:(?:width|height|type|alt)" content="[^"]*"\s*\/?>/g, '');
  } else {
    output = output
      .replace(/\s*<meta property="og:image" content="[^"]*"\s*\/?>/g, '')
      .replace(/\s*<meta property="og:image:(?:secure_url|width|height|type|alt)" content="[^"]*"\s*\/?>/g, '')
      .replace(/\s*<meta name="twitter:image" content="[^"]*"\s*\/?>/g, '')
      .replace('summary_large_image', 'summary');
  }
  return output;
}

function staticItemPages() {
  return {
    name: 'homeos-static-item-pages',
    async closeBundle() {
      const outDir = resolve(projectRoot, 'dist-pages');
      const [template, source] = await Promise.all([
        readFile(resolve(outDir, 'index.html'), 'utf8'),
        readFile(resolve(projectRoot, 'data/progress.json'), 'utf8'),
      ]);
      const items = (JSON.parse(source) as { items: StaticItem[] }).items;
      await Promise.all(items.map(async (item) => {
        const itemDir = resolve(outDir, 'items', item.id);
        await mkdir(itemDir, { recursive: true });
        await writeFile(resolve(itemDir, 'index.html'), replaceMeta(template, item));
      }));
    },
  };
}

export default defineConfig({
  base: '/homeos-project-progress/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react(), staticItemPages()],
  resolve: { alias: { '@': resolve(projectRoot) } },
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
  },
});
