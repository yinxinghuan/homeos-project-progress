import { chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, '..');
const homeRoot = resolve(siteRoot, '..');
const dataDir = resolve(siteRoot, 'data');
const publicDocsDir = resolve(siteRoot, 'public', 'technical');

const procurement = JSON.parse(await readFile(resolve(homeRoot, '06-records', 'procurement.json'), 'utf8'));

const detailSources = {
  windows: ['02-renovation/WINDOWS.md'],
  'water-system': ['03-systems/water-treatment.md', '03-systems/plumbing.md'],
  tiles: ['02-renovation/TILE_LAYOUT.md'],
  'gas-water-heater': ['04-assets/appliances/rinnai-rux-a1616w-e-water-heater.md', '03-systems/gas.md'],
  'grohe-shower': ['04-assets/fixtures/grohe-26810000-thermostatic-shower.md'],
  'grohe-kitchen-faucet': ['04-assets/fixtures/grohe-31874-kitchen-faucet.md'],
  'grohe-smart-toilet': ['04-assets/fixtures/grohe-39932sh0-smart-toilet.md'],
  'kitchen-cabinetry': ['02-renovation/KITCHEN_CABINETRY.md'],
  terrazzo: ['02-renovation/TERRAZZO.md'],
  construction: ['02-renovation/WATER_ELECTRICAL_WALL_CONTRACT.md'],
  bathtub: ['04-assets/fixtures/toto-pay1320p-bathtub.md', 'decisions/0003-bathroom-bathtub-selection.md'],
  flooring: ['02-renovation/FLOORING.md'],
  heating: ['03-systems/heating.md'],
  'kitchen-sink': ['04-assets/fixtures/grohe-k500-31919sd0-kitchen-sink.md'],
  dishwasher: ['04-assets/appliances/built-in-dishwasher-598.md'],
  oven: ['04-assets/appliances/built-in-oven-595x454.md'],
  'range-hood': ['04-assets/appliances/liudianban-y6-range-hood.md'],
  'gas-cooktop': ['04-assets/appliances/liudianban-two-burner-gas-cooktop.md'],
  'wire-materials': ['03-systems/electrical.md'],
  'pipe-materials': ['03-systems/plumbing.md'],
  lighting: ['03-systems/lighting.md'],
  switches: ['03-systems/electrical.md'],
};

const safeAssets = {
  'water-system': [
    'source/media/2026-08-26-central-purifier-softener-installation-requirements.jpeg',
    'source/media/2026-08-26-central-water-treatment-cabinet-clearance-reference.jpeg',
  ],
  'grohe-shower': [
    'source/manuals/grohe/grohe-26810000-dimension.jpg',
    'source/manuals/grohe/grohe-26810000-installation.pdf',
  ],
  'grohe-kitchen-faucet': [
    'source/manuals/grohe/grohe-3187400C-dimension.jpg',
    'source/manuals/grohe/grohe-3187400C-installation.pdf',
  ],
  'grohe-smart-toilet': [
    'source/media/2026-08-30-grohe-igina-light-39932-39947-dimension-sheet.png',
    'source/manuals/grohe/grohe-39947SH0-product-specification.pdf',
    'source/manuals/grohe/grohe-igina-39933-39948-user-manual.pdf',
  ],
  'kitchen-sink': [
    'source/manuals/grohe/grohe-31919SD0-dimension.jpg',
    'source/manuals/grohe/grohe-31919SD0-installation.pdf',
  ],
  dishwasher: ['source/media/2026-08-24-built-in-dishwasher-installation-reference.jpg'],
  oven: ['source/media/2026-08-24-built-in-oven-dimension-reference.jpg'],
  'range-hood': ['source/media/2026-08-24-liudianban-y6-range-hood-installation.jpg'],
  'gas-cooktop': ['source/media/2026-08-24-two-burner-cooktop-cabinet-reference.jpg'],
};

const blocked = /¥|￥|\bCNY\b|\bprices?\b|\bpayments?\b|\binvoices?\b|\bcosts?\b|\bfees?\b|\bcharges?\b|chargeable|surcharges?|\bdeposits?\b|\bbalances?\b|\bquotations?\b|\baddress\b|\bphone\b|金额|价格|付款|支付|定金|余款|全款|报价|收费|费用|地址|电话|姓名|客户|账户|合同编号|订单编号|销售单号|发票/i;
const technicalHeading = /安装|尺寸|规格|技术|留位|开孔|接口|水电|排水|供电|通风|协调|验收|到货|施工|要求|条件|配置|product data|dimension|installation|acceptance|hold point|requirement|coordination|utility|clearance|before/i;

function clean(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTechnical(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (heading) {
      if (current?.points.length) sections.push(current);
      const title = clean(heading[1]);
      current = technicalHeading.test(title) ? { title: blocked.test(title) ? '技术与现场要点' : title, points: [] } : null;
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (current && bullet) {
      const point = clean(bullet[1]);
      if (point && !blocked.test(point)) current.points.push(point);
    }
  }
  if (current?.points.length) sections.push(current);
  return sections.filter((section) => section.points.length > 0);
}

function stageFor(status) {
  if (['paid_full', 'paid_full_in_transit', 'product_paid_install_pending'].includes(status)) return 'ordered';
  if (['deposit_paid', 'deposit_paid_total_unknown', 'installment_paid'].includes(status)) return 'confirmed';
  if (['selected_not_ordered', 'direction_selected'].includes(status)) return 'selected';
  if (status === 'contractor_procurement') return 'coordination';
  return 'planning';
}

const stageLabels = {
  ordered: '已采购 / 待交付安装',
  confirmed: '已确定 / 推进中',
  selected: '型号或方向已定',
  coordination: '施工方协调采购',
  planning: '待选型',
};

await mkdir(dataDir, { recursive: true });
await mkdir(publicDocsDir, { recursive: true });

const items = [];
for (const sourceItem of procurement.items) {
  const stage = stageFor(sourceItem.status);
  const technical = [];
  for (const relativePath of detailSources[sourceItem.id] ?? []) {
    const content = await readFile(resolve(homeRoot, relativePath), 'utf8');
    const sections = parseTechnical(content);
    if (sections.length) technical.push({ source: relativePath, sections });
  }

  const assets = [];
  for (const relativePath of safeAssets[sourceItem.id] ?? []) {
    const fileName = basename(relativePath);
    const destination = resolve(publicDocsDir, fileName);
    await chmod(destination, 0o644).catch(() => {});
    await copyFile(resolve(homeRoot, relativePath), destination);
    await chmod(destination, 0o644);
    assets.push({
      title: clean(fileName.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replaceAll('-', ' ')),
      href: `/technical/${encodeURIComponent(fileName)}`,
      type: extname(fileName).toLowerCase() === '.pdf' ? 'pdf' : 'image',
    });
  }

  items.push({
    id: sourceItem.id,
    name: sourceItem.name,
    category: sourceItem.category,
    brand: sourceItem.brand ?? null,
    model: sourceItem.model && !blocked.test(sourceItem.model) ? sourceItem.model : null,
    stage,
    stageLabel: stageLabels[stage],
    progress: blocked.test(sourceItem.progress) ? stageLabels[stage] : sourceItem.progress,
    nextAction: blocked.test(sourceItem.nextAction) ? '具体安排由项目负责人另行确认' : sourceItem.nextAction,
    technical,
    assets,
  });
}

const output = {
  schemaVersion: 1,
  updatedAt: procurement.updatedAt,
  project: { title: 'HomeOS 工程进度', phase: '装修执行与设备协调' },
  stages: Object.entries(stageLabels).map(([id, label]) => ({ id, label })),
  items,
};

const serialized = JSON.stringify(output, null, 2);
const blockedMatches = serialized.match(new RegExp(blocked.source, 'gi'));
if (blockedMatches) {
  throw new Error(`Sanitization guard failed: ${[...new Set(blockedMatches)].join(', ')}`);
}
await writeFile(resolve(dataDir, 'progress.json'), serialized);
console.log(`Generated sanitized public progress data for ${items.length} work items.`);
