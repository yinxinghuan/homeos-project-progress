import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteRoot = resolve(import.meta.dirname, '..');
const progress = JSON.parse(await readFile(resolve(siteRoot, 'data/progress.json'), 'utf8'));
const translations = JSON.parse(await readFile(resolve(siteRoot, 'data/detail-translations.zh-CN.json'), 'utf8'));

function shouldTranslate(text) {
  if (typeof text !== 'string' || !/[a-z]{4,}/.test(text) || /[\u3400-\u9fff]/.test(text)) return false;
  if (/^(?:https?:\/\/|[\w./-]+\.(?:md|pdf|png|jpe?g|json))$/i.test(text.trim())) return false;
  if (!/[A-Za-z]{2,}.*[A-Za-z]{2,}/.test(text) && /^[A-Z0-9_.+×/() -]+$/.test(text.trim())) return false;
  return true;
}

const strings = [];
for (const item of progress.items ?? []) {
  for (const record of item.technical ?? []) {
    for (const section of record.sections ?? []) strings.push(section.title, ...(section.points ?? []));
  }
}

const missing = [...new Set(strings.filter(shouldTranslate))].filter((text) => !translations[text] || !/[\u3400-\u9fff]/.test(translations[text]));
if (missing.length) {
  console.error(`Missing Chinese translations for ${missing.length} public project-detail strings:`);
  console.error(missing.slice(0, 20).map((text) => `- ${text}`).join('\n'));
  process.exit(1);
}

console.log(`Public detail translation check passed (${Object.keys(translations).length} public translations).`);
