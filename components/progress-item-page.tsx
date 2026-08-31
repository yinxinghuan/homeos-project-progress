/* oxlint-disable next/no-img-element -- shared component is also rendered by the Vite GitHub Pages build */
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  ImageIcon,
  Info,
  ListTree,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import { data, priorityStyle, shortRange, stageColors, type ProgressItem, type TimelineActual } from '@/lib/progress';
import { BilingualText } from '@/components/bilingual-text';

const actualStyle: Record<NonNullable<TimelineActual>['status'], { label: string; tone: string }> = {
  not_started: { label: '未开始', tone: 'bg-[#edf0f1] text-[#68757a]' },
  scheduled: { label: '已预约', tone: 'bg-[#f3ece2] text-[#785a3d]' },
  in_progress: { label: '进行中', tone: 'bg-[#e4edf4] text-[#315e7c]' },
  completed: { label: '已完成', tone: 'bg-[#e4efe9] text-[#326250]' },
  blocked: { label: '受阻', tone: 'bg-[#f5e7e3] text-[#895347]' },
};

function normalizeBasePath(basePath: string) {
  return basePath.replace(/\/$/, '');
}

function overviewHref(basePath: string, anchor = '') {
  const root = normalizeBasePath(basePath);
  return `${root || ''}/${anchor}`;
}

function itemHref(id: string, basePath: string) {
  const root = normalizeBasePath(basePath);
  return `${root || ''}/items/${id}${root ? '/' : ''}`;
}

function assetHref(href: string, basePath: string) {
  if (/^(https?:)?\/\//.test(href)) return href;
  const root = normalizeBasePath(basePath);
  return `${root || ''}/${href.replace(/^\//, '')}`;
}

export function ProgressItemPage({ item, basePath = '' }: { item: ProgressItem; basePath?: string }) {
  const index = data.items.findIndex((entry) => entry.id === item.id);
  const previous = data.items[index - 1];
  const next = data.items[index + 1];
  const colors = stageColors[item.stage];
  const timelineRows = [...data.timeline.main, ...data.timeline.suppliers].filter((row) => row.linkedItemIds.includes(item.id));
  const technicalCount = item.technical.reduce((total, record) => total + record.sections.reduce((sum, section) => sum + section.points.length, 0), 0);

  return (
    <main className="mobile-readable min-h-screen bg-[#f4f6f7] text-[#20282d]">
      <header className="sticky top-0 z-40 border-b border-[#d7dde0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <a href={overviewHref(basePath)} className="group inline-flex min-h-10 items-center gap-2 rounded-[7px] px-2 text-sm font-medium text-[#50646d] transition hover:bg-[#f0f4f5]">
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />返回工程总表
          </a>
          <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-[8px] bg-[#1f4f76] text-[8px] font-bold text-white">H/OS</span><span className="hidden text-[11px] text-[#7d8b91] sm:inline">公开工程档案</span></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-7 sm:py-8">
        <nav className="mb-4 flex items-center gap-2 text-[11px] text-[#77878e]" aria-label="面包屑">
          <a href={overviewHref(basePath)} className="hover:text-[#1f4f76]">工程总表</a><span>/</span><span>{item.category}</span><span>/</span><span className="truncate text-[#45565e]">{item.name}</span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0">
            <section className="relative overflow-hidden border border-[#cbd6da] bg-white sm:rounded-[12px]">
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: colors.dot }} />
              <div className="p-5 pl-7 sm:p-8 sm:pl-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: colors.fill, color: colors.text }}><i className="mr-1.5 inline-block size-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />{item.stageLabel}</span>
                  {item.priority && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyle(item.priority)}`}>{item.priority}{item.decisionDeadline ? ` · ${item.decisionDeadline.slice(5).replace('-', '/')}` : ''}</span>}
                  <span className="text-[11px] text-[#89959a]">{item.category}</span>
                </div>
                <h1 className="mt-5 text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.03] tracking-[-0.05em]">{item.name}</h1>
                <p className="mt-3 text-sm leading-6 text-[#68767c]">{[item.brand, item.model].filter(Boolean).join(' · ') || '具体品牌与型号待补充'}</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-[#2f638c] bg-[#f7f9fa] p-4"><p className="text-[10px] font-medium tracking-[0.12em] text-[#859197]">CURRENT · 当前</p><p className="mt-2 text-sm leading-6 text-[#4f5f66]">{item.progress}</p></div>
                  <div className="border-l-2 border-[#dc7440] bg-[#faf8f5] p-4"><p className="text-[10px] font-medium tracking-[0.12em] text-[#8d7d70]">NEXT · 下一步</p><p className="mt-2 text-sm leading-6 text-[#4f5f66]">{item.nextAction}</p></div>
                </div>
                {item.priority && item.urgencyReason && <div className="mt-4 border border-[#ead8ca] bg-[#fffaf6] p-4"><p className="text-[10px] font-medium tracking-[0.11em] text-[#8d705d]">优先级说明</p><p className="mt-2 text-sm leading-6 text-[#66584f]">{item.urgencyReason}</p></div>}
              </div>
            </section>

            <section className="mt-5 border border-[#d7dde0] bg-white p-5 sm:rounded-[12px] sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-medium tracking-[0.12em] text-[#879298]">PROJECT CONNECTIONS</p><h2 className="mt-1 text-xl font-semibold">关联工程节点</h2></div><a href={overviewHref(basePath, '#timeline')} className="inline-flex min-h-9 items-center gap-1 rounded-[6px] border border-[#d4dde0] px-3 text-xs font-medium text-[#536c77] hover:bg-[#f3f7f8]">回到时间总表 <ArrowUpRight className="size-3.5" /></a></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {timelineRows.map((row) => {
                  const state = row.actual ? actualStyle[row.actual.status] : { label: '按计划', tone: 'bg-[#edf0f1] text-[#68757a]' };
                  return <article key={`${row.kind}:${row.name}`} className="border-l-2 border-[#7f9aa6] bg-[#f7f9fa] p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold leading-5">{row.name}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${state.tone}`}>{state.label}</span></div><p className="mt-2 flex items-center gap-1.5 font-data text-[11px] text-[#697b83]"><CalendarDays className="size-3.5" />{row.ranges.map(shortRange).join(' · ')}</p>{row.actual?.note && <p className="mt-2 text-xs leading-5 text-[#75848a]">{row.actual.note}</p>}</article>;
                })}
                {!timelineRows.length && <div className="border border-dashed border-[#ccd6da] p-5 text-sm text-[#7c898f] sm:col-span-2"><Info className="mr-2 inline size-4" />该事项尚未关联到具体施工节点。</div>}
              </div>
            </section>

            <section className="mt-5 border border-[#d7dde0] bg-white p-5 sm:rounded-[12px] sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-medium tracking-[0.12em] text-[#879298]">INSTALLATION DOSSIER · 安装档案</p><h2 className="mt-1 text-xl font-semibold">型号与安装信息</h2></div><span className="flex items-center gap-1.5 text-[11px] text-[#77858b]"><Wrench className="size-3.5" />{technicalCount} 条技术信息</span></div>
              <div className="mt-5 space-y-4">
                {item.technical.map((record) => <article key={record.source} className="border border-[#dde3e5] bg-[#fbfcfc] p-4 sm:rounded-[8px] sm:p-5"><p className="font-data text-[10px] text-[#909a9e]">{record.source}</p>{record.sections.map((section) => <section key={section.title} className="mt-5 border-t border-[#e4e8e9] pt-5 first:mt-3 first:border-0 first:pt-0"><h3 className="text-[15px] font-semibold"><BilingualText text={section.title} translationClassName="mt-1 text-[0.9em] font-medium leading-5 text-[#718087]" /></h3><ul className="mt-3 space-y-3">{section.points.map((point, pointIndex) => <li key={pointIndex} className="grid grid-cols-[7px_1fr] gap-2.5 text-sm leading-6 text-[#59676d]"><span className="mt-[9px] size-1.5 rounded-full bg-[#7f969f]" /><span><BilingualText text={point} /></span></li>)}</ul></section>)}</article>)}
                {!item.technical.length && <div className="border border-dashed border-[#ccd5d8] bg-[#f9fafb] p-6 text-sm leading-6 text-[#7c888d]"><Info className="mr-2 inline size-4" />详细型号或安装资料尚未进入 HomeOS；取得后会同步到这里。</div>}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="border border-[#d7dde0] bg-white p-5 sm:rounded-[12px]">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-medium tracking-[0.12em] text-[#879298]">FILES & DRAWINGS · 文件与图纸</p><h2 className="mt-1 text-sm font-semibold">图纸与安装附件</h2></div><span className="font-data text-xs text-[#89949a]">{item.assets.length}</span></div>
              <div className="mt-4 space-y-3">
                {item.assets.map((asset) => { const href = assetHref(asset.href, basePath); return <a key={asset.href} href={href} target="_blank" rel="noreferrer" className="group block overflow-hidden border border-[#dbe1e3] bg-[#fafbfb] transition hover:border-[#9fb2ba] sm:rounded-[8px]">{asset.type === 'image' ? <div className="aspect-[16/10] overflow-hidden bg-[#e9eef0]"><img src={href} alt={asset.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]" /></div> : <div className="grid aspect-[16/9] place-items-center bg-[#e9eef0]"><FileText className="size-8 text-[#708791]" /></div>}<div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs font-medium">{asset.title}</span><ArrowUpRight className="size-3.5 shrink-0 text-[#72848b]" /></div></a>; })}
                {!item.assets.length && <div className="border border-dashed border-[#d1d9dc] p-4 text-xs leading-5 text-[#839095]"><ImageIcon className="mb-2 size-4" />暂无可公开的技术图纸附件。</div>}
              </div>
            </section>

            <section className="border border-[#d7dde0] bg-white p-5 sm:rounded-[12px]"><p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-[#879298]"><ListTree className="size-3.5" />RECORD POSITION · 档案位置</p><p className="mt-2 text-sm font-semibold">第 {index + 1} / {data.items.length} 项</p><p className="mt-2 text-xs leading-5 text-[#7a878c]">独立页面保留型号、尺寸、安装条件、图纸和关联工程节点；不展示价格与地址。</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#557065]"><ShieldCheck className="size-3.5" />公开脱敏工程档案</div></section>

            <div className="grid grid-cols-2 gap-2">
              {previous ? <a href={itemHref(previous.id, basePath)} className="group rounded-[8px] border border-[#d7dde0] bg-white p-3 transition hover:border-[#9fb2ba] hover:bg-[#f7f9fa]"><span className="flex items-center gap-1 text-[10px] text-[#929ca0]"><ArrowLeft className="size-3" />上一项</span><span className="mt-1.5 block truncate text-xs font-medium">{previous.name}</span></a> : <span />}
              {next && <a href={itemHref(next.id, basePath)} className="group rounded-[8px] border border-[#d7dde0] bg-white p-3 text-right transition hover:border-[#9fb2ba] hover:bg-[#f7f9fa]"><span className="flex items-center justify-end gap-1 text-[10px] text-[#929ca0]">下一项<ArrowRight className="size-3" /></span><span className="mt-1.5 block truncate text-xs font-medium">{next.name}</span></a>}
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[#d2d9dc] py-6 text-[11px] text-[#7f8a8f] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />HomeOS 工程协作版</span><span>独立事项页 · 可直接分享</span></footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[1fr_auto] border-t border-[#ccd6da] bg-white/95 p-2 shadow-[0_-8px_24px_rgba(25,53,66,.08)] backdrop-blur lg:hidden">
        <a href={overviewHref(basePath)} className="flex min-h-11 items-center justify-center gap-2 rounded-[7px] text-sm font-medium text-[#4d6470]"><ArrowLeft className="size-4" />工程总表</a>
        {next && <a href={itemHref(next.id, basePath)} className="flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-[#1f4f76] px-4 text-sm font-medium text-white">下一项<ArrowRight className="size-4" /></a>}
      </div>
      <div className="h-16 lg:hidden" />
    </main>
  );
}
