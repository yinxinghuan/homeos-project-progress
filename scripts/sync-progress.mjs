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

const blocked = /¥|￥|\bCNY\b|\bprices?\b|\bpayments?\b|\binvoices?\b|\bcosts?\b|\bfees?\b|\bcharges?\b|chargeable|surcharges?|\bdeposits?\b|\bbalances?\b|\bquotations?\b|\baddress\b|\bphone\b|金额|价格|付款|支付|定金|余款|全款|付清|实付|报价|收费|费用|地址|电话|姓名|客户|账户|合同编号|订单编号|销售单号|发票/i;
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

function parseTableSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return [];
  const tableStart = lines.findIndex((line, index) => index > start && /^\s*\|/.test(line));
  if (tableStart < 0) return [];
  const rows = [];
  for (let index = tableStart; index < lines.length && /^\s*\|/.test(lines[index]); index += 1) {
    rows.push(lines[index].split('|').slice(1, -1).map(clean));
  }
  return rows.length > 2 ? rows.slice(2) : [];
}

const monthNumbers = { Aug: 8, Sep: 9, Oct: 10 };
const datePattern = /(?:Aug|Sep|Oct)\s+\d{1,2}(?:-(?:(?:Aug|Sep|Oct)\s+)?\d{1,2})?/g;
const timelineLabels = {
  'Property renovation procedures': '物业装修手续',
  'Wall demolition and wall-skin removal': '墙体拆除与铲墙皮',
  'Construction-waste removal': '建筑垃圾清运',
  'Cabinet, water/electrical and equipment point-position coordination': '橱柜、水电与设备点位联合确认',
  'Strong/weak-current chasing and wiring': '强弱电开槽与布线',
  'Water-line chasing and piping': '水路开槽与布管',
  'Water and electrical inspection': '水电验收',
  'New walls and wall plastering': '新建墙体与抹灰',
  'Bathroom waterproofing and closed-water test': '卫生间防水与闭水试验',
  'Wall/floor leveling and tiling': '墙地找平与铺砖',
  'Masonry acceptance': '瓦工验收',
  'Living/dining ceiling and plasterboard false-beam work': '客餐厅吊顶及假梁',
  'Kitchen and bathroom ceiling work': '厨卫吊顶施工',
  'Wall/ceiling base treatment': '墙顶基层处理',
  'Gypsum cornice': '石膏线',
  'Putty application and sanding': '刮腻子与打磨',
  'Wall/ceiling paint': '墙顶面涂刷',
  'Paint touch-up / closeout cleaning stage': '补漆与收尾保洁',
  'Completion acceptance and warranty paperwork': '竣工验收与保修资料',
  Radiators: '暖气片',
  Windows: '窗户',
  'Entry security door': '入户门',
  'Wall and floor tiles': '墙地砖',
  Cabinets: '橱柜',
  'Kitchen appliances, sink, water heater': '厨电、水槽与热水器',
  'Window-sill stone': '窗台石',
  'Kitchen/bath aluminum ceiling': '厨卫铝扣板吊顶',
  'Wall paint': '墙漆',
  'Lights, switches, sockets': '灯具、开关与插座',
  'Bathroom fixtures and hardware': '卫浴洁具与五金',
  'Wooden doors': '室内木门',
  Flooring: '地板',
};
const timelineItemLinks = {
  'Property renovation procedures': ['construction'],
  'Wall demolition and wall-skin removal': ['construction'],
  'Construction-waste removal': ['construction'],
  'Cabinet, water/electrical and equipment point-position coordination': ['construction', 'kitchen-cabinetry', 'wire-materials', 'pipe-materials', 'water-system', 'kitchen-sink', 'dishwasher', 'oven', 'range-hood', 'gas-cooktop', 'refrigerator', 'air-conditioning', 'switches', 'lighting', 'washing-machine', 'bathroom-vanity'],
  'Strong/weak-current chasing and wiring': ['construction', 'wire-materials', 'switches'],
  'Water-line chasing and piping': ['construction', 'pipe-materials', 'water-system'],
  'Water and electrical inspection': ['construction'],
  'New walls and wall plastering': ['construction'],
  'Bathroom waterproofing and closed-water test': ['construction'],
  'Wall/floor leveling and tiling': ['construction', 'tiles'],
  'Masonry acceptance': ['construction', 'tiles'],
  'Living/dining ceiling and plasterboard false-beam work': ['construction'],
  'Kitchen and bathroom ceiling work': ['kitchen-ceiling', 'bathroom-ceiling'],
  'Wall/ceiling base treatment': ['construction', 'wall-paint'],
  'Gypsum cornice': ['construction'],
  'Putty application and sanding': ['construction', 'wall-paint'],
  'Wall/ceiling paint': ['wall-paint', 'construction'],
  'Paint touch-up / closeout cleaning stage': ['wall-paint', 'construction'],
  'Completion acceptance and warranty paperwork': ['construction'],
  Radiators: ['heating'],
  Windows: ['windows'],
  'Entry security door': ['entry-door'],
  'Wall and floor tiles': ['tiles'],
  Cabinets: ['kitchen-cabinetry'],
  'Kitchen appliances, sink, water heater': ['gas-water-heater', 'kitchen-sink', 'dishwasher', 'oven', 'range-hood', 'gas-cooktop'],
  'Window-sill stone': ['terrazzo'],
  'Kitchen/bath aluminum ceiling': ['kitchen-ceiling', 'bathroom-ceiling'],
  'Wall paint': ['wall-paint'],
  'Lights, switches, sockets': ['lighting', 'switches'],
  'Bathroom fixtures and hardware': ['grohe-shower', 'grohe-kitchen-faucet', 'grohe-smart-toilet', 'bathtub', 'bathroom-vanity'],
  'Wooden doors': ['bedroom-doors', 'bathroom-door'],
  Flooring: ['flooring'],
};

function dateRange(label) {
  const match = label.match(/(Aug|Sep|Oct)\s+(\d{1,2})(?:-(?:(Aug|Sep|Oct)\s+)?(\d{1,2}))?/);
  if (!match) return null;
  const startMonth = monthNumbers[match[1]];
  const endMonth = monthNumbers[match[3] ?? match[1]];
  const start = `2026-${String(startMonth).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
  const end = `2026-${String(endMonth).padStart(2, '0')}-${String(Number(match[4] ?? match[2])).padStart(2, '0')}`;
  return { start, end, label };
}

function buildTimeline(content, trackingContent) {
  const actualMap = new Map(parseTableSection(trackingContent, 'Confirmed Actual Progress').map((row) => [row[0], {
    status: row[1],
    confirmedDate: row[2] || null,
    note: row[4] && !blocked.test(row[4]) ? row[4] : null,
  }]));
  const actualFor = (name) => actualMap.get(name) ?? null;
  const phases = parseTableSection(content, 'Schedule Board Phases')
    .map((row) => ({ name: row[0], range: dateRange(row[1]), focus: row[2] }))
    .filter((phase) => phase.range);
  const main = parseTableSection(content, 'Main Construction Sequence')
    .map((row) => { const name = timelineLabels[row[1]] ?? row[1]; return { name, kind: 'construction', linkedItemIds: timelineItemLinks[row[1]] ?? [], actual: actualFor(name), ranges: [dateRange(row[2])].filter(Boolean) }; })
    .filter((row) => row.ranges.length);
  const suppliers = parseTableSection(content, 'Supplier and Installation Milestones')
    .map((row) => { const name = timelineLabels[row[0]] ?? row[0]; return ({
      name,
      kind: 'supplier',
      linkedItemIds: timelineItemLinks[row[0]] ?? [],
      actual: actualFor(name),
      ranges: row.slice(1).flatMap((cell) => (cell.match(datePattern) ?? []).map(dateRange)).filter(Boolean),
    }); })
    .filter((row) => row.ranges.length);
  return {
    title: '工程时间总表',
    start: '2026-08-24',
    end: '2026-10-30',
    durationDays: 68,
    source: '02-renovation/CONSTRUCTION_PLAN.md',
    trackingSource: '02-renovation/CONSTRUCTION_PROGRESS.md',
    actualStatus: actualMap.size ? 'recorded' : 'not_confirmed',
    actualCount: actualMap.size,
    phases,
    main,
    suppliers,
  };
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
      href: `technical/${encodeURIComponent(fileName)}`,
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
    priority: sourceItem.priority ?? null,
    decisionDeadline: sourceItem.decisionDeadline ?? null,
    urgencyReason: sourceItem.urgencyReason && !blocked.test(sourceItem.urgencyReason) ? sourceItem.urgencyReason : null,
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
  timeline: buildTimeline(
    await readFile(resolve(homeRoot, '02-renovation', 'CONSTRUCTION_PLAN.md'), 'utf8'),
    await readFile(resolve(homeRoot, '02-renovation', 'CONSTRUCTION_PROGRESS.md'), 'utf8'),
  ),
};

const serialized = JSON.stringify(output, null, 2);
const blockedMatches = serialized.match(new RegExp(blocked.source, 'gi'));
if (blockedMatches) {
  throw new Error(`Sanitization guard failed: ${[...new Set(blockedMatches)].join(', ')}`);
}
await writeFile(resolve(dataDir, 'progress.json'), serialized);
console.log(`Generated sanitized public progress data for ${items.length} work items.`);
