'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  ImageIcon,
  Info,
  Link2,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import progressData from '@/data/progress.json';
import { Input } from '@/components/ui/input';

type Stage = 'ordered' | 'confirmed' | 'selected' | 'coordination' | 'planning';
type TechnicalSection = { title: string; points: string[] };
type ProgressItem = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  stage: Stage;
  stageLabel: string;
  priority: 'P0' | 'P1' | 'P2' | null;
  decisionDeadline: string | null;
  urgencyReason: string | null;
  progress: string;
  nextAction: string;
  technical: { source: string; sections: TechnicalSection[] }[];
  assets: { title: string; href: string; type: 'pdf' | 'image' }[];
};
type TimelineRange = { start: string; end: string; label: string };
type TimelineActual = { status: 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'blocked'; confirmedDate: string | null; note: string | null };
type TimelineRow = { name: string; kind: 'construction' | 'supplier'; linkedItemIds: string[]; actual: TimelineActual | null; ranges: TimelineRange[] };

const data = progressData as {
  updatedAt: string;
  project: { title: string; phase: string };
  stages: { id: Stage; label: string }[];
  items: ProgressItem[];
  timeline: { title: string; start: string; end: string; durationDays: number; source: string; trackingSource: string; actualStatus: 'not_confirmed' | 'recorded'; actualCount: number; phases: { name: string; range: TimelineRange; focus: string }[]; main: TimelineRow[]; suppliers: TimelineRow[] };
};

const stageColors: Record<Stage, { dot: string; fill: string; text: string }> = {
  ordered: { dot: '#2c6a58', fill: '#e5f0eb', text: '#315d50' },
  confirmed: { dot: '#2d5f8b', fill: '#e5edf5', text: '#355f81' },
  selected: { dot: '#7b6b42', fill: '#f0ecdf', text: '#6c5d36' },
  coordination: { dot: '#9a613d', fill: '#f4e9e2', text: '#80543a' },
  planning: { dot: '#8a9194', fill: '#eceeef', text: '#666e71' },
};

const priorityStyle = (priority: ProgressItem['priority']) => priority === 'P0'
  ? 'border-[#dba98f] bg-[#fff1e9] text-[#8a482c]'
  : priority === 'P1'
    ? 'border-[#ddc99e] bg-[#fbf5e8] text-[#765d27]'
    : 'border-[#cbd6da] bg-[#f1f5f6] text-[#5f737b]';
function utcDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function shortRange(range: TimelineRange) {
  const format = (value: string) => `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}`;
  return range.start === range.end ? format(range.start) : `${format(range.start)}—${format(range.end)}`;
}

function TimelineBoard({ onOpenItem }: { onOpenItem: (id: string) => void }) {
  const timeline = data.timeline;
  const total = timeline.durationDays;
  const startDay = utcDay(timeline.start);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayOffset = utcDay(todayKey) - startDay;
  const months = [
    { label: '8 月', start: '2026-08-24', end: '2026-08-31' },
    { label: '9 月', start: '2026-09-01', end: '2026-09-30' },
    { label: '10 月', start: '2026-10-01', end: '2026-10-30' },
  ];
  const allRows = [...timeline.main, ...timeline.suppliers];
  const phaseGroups = timeline.phases.map((phase) => ({
    ...phase,
    rows: allRows.map((row) => ({ ...row, ranges: row.ranges.filter((range) => range.start <= phase.range.end && range.end >= phase.range.start) })).filter((row) => row.ranges.length),
  }));
  const planState = (row: TimelineRow) => {
    if (row.ranges.some((range) => range.start <= todayKey && range.end >= todayKey)) return { id: 'current', label: '计划进行中', shortLabel: '计划中', tone: 'bg-[#e4edf4] text-[#315e7c]', bar: row.kind === 'construction' ? '#34698f' : '#db7442' };
    if (row.ranges.every((range) => range.end < todayKey)) return { id: 'past', label: '计划窗口已过', shortLabel: '待确认', tone: 'bg-[#edf0f1] text-[#69757a]', bar: '#9aa7ac' };
    return { id: 'upcoming', label: '计划待开始', shortLabel: '待开始', tone: 'bg-[#f5ebdf] text-[#805d3e]', bar: row.kind === 'construction' ? '#34698f' : '#db7442' };
  };
  const actualState = (actual: TimelineActual) => ({
    not_started: { label: '现场确认未开始', shortLabel: '未开始', tone: 'bg-[#edf0f1] text-[#68757a]', bar: '#9aa7ac' },
    scheduled: { label: '现场预约已确认', shortLabel: '已预约', tone: 'bg-[#f3ece2] text-[#785a3d]', bar: '#b27b47' },
    in_progress: { label: '现场确认进行中', shortLabel: '进行中', tone: 'bg-[#e4edf4] text-[#315e7c]', bar: '#2e6d8f' },
    completed: { label: '现场确认已完成', shortLabel: '已完成', tone: 'bg-[#e4efe9] text-[#326250]', bar: '#3f8067' },
    blocked: { label: '现场确认受阻', shortLabel: '受阻', tone: 'bg-[#f5e7e3] text-[#895347]', bar: '#a2574a' },
  }[actual.status]);
  const currentRows = allRows.filter((row) => planState(row).id === 'current');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [openPhases, setOpenPhases] = useState<string[]>(() => [phaseGroups.find((phase) => phase.range.start <= todayKey && phase.range.end >= todayKey)?.name ?? phaseGroups[0].name]);
  const barStyle = (range: TimelineRange) => ({
    left: `${((utcDay(range.start) - startDay) / total) * 100}%`,
    width: `${Math.max(((utcDay(range.end) - utcDay(range.start) + 1) / total) * 100, 1.45)}%`,
  });
  const togglePhase = (name: string) => setOpenPhases((current) => current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]);
  const stateFor = (row: TimelineRow) => row.actual ? actualState(row.actual) : planState(row);
  const rowKey = (row: TimelineRow) => `${row.kind}:${row.name}`;
  const rowDomToken = (row: TimelineRow) => `${row.kind}-${allRows.findIndex((entry) => rowKey(entry) === rowKey(row))}`;
  const openTimelineRow = (row: TimelineRow, reveal = false) => {
    const key = rowKey(row);
    const willOpen = selectedKey !== key;
    setSelectedKey(willOpen ? key : null);
    if (!willOpen) return;
    const containingPhases = timeline.phases.filter((phase) => row.ranges.some((range) => range.start <= phase.range.end && range.end >= phase.range.start)).map((phase) => phase.name);
    setOpenPhases((current) => [...new Set([...current, ...containingPhases])]);
    if (reveal) window.setTimeout(() => {
      const targets = [...document.querySelectorAll<HTMLElement>(`[data-timeline-row="${rowDomToken(row)}"]`)];
      targets.find((target) => target.offsetParent !== null)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const rowDetail = (row: TimelineRow, compact = false) => {
    const linkedItems = row.linkedItemIds.map((id) => data.items.find((item) => item.id === id)).filter((item): item is ProgressItem => Boolean(item));
    const state = stateFor(row);
    return (
    <div className={`${compact ? 'border-x border-b border-[#d9e2e6] bg-[#f7f9fa] p-3' : 'grid gap-4 border-b border-[#dce3e6] bg-[#f7f9fa] p-5 sm:grid-cols-[220px_1fr]'}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${state.tone}`}>{state.label}</span><span className="font-data text-[11px] text-[#667983]">{row.ranges.map(shortRange).join(' · ')}</span></div>
        <h3 className="mt-2 text-sm font-semibold">{row.name}</h3>
        <p className="mt-1.5 text-[11px] leading-5 text-[#7b888e]">{row.actual ? `${row.actual.confirmedDate ? `确认于 ${row.actual.confirmedDate}。` : ''}${row.actual.note ?? ''}` : '当前标签只按计划日期计算；实际完成状态尚未录入。'}</p>
      </div>
      <div>
        <p className="text-[10px] font-medium tracking-[0.1em] text-[#839096]">关联事项 · {linkedItems.length}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {linkedItems.map((item) => <button key={item.id} onClick={() => onOpenItem(item.id)} className="group flex min-h-14 items-center justify-between gap-3 rounded-[6px] border border-[#d7e0e3] bg-white px-3 py-2.5 text-left transition hover:border-[#8fa7b2] focus-visible:ring-2 focus-visible:ring-[#6d91a7]">
            <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><strong className="text-xs font-semibold">{item.name}</strong>{item.priority && <small className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${priorityStyle(item.priority)}`}>{item.priority}</small>}</span><span className="mt-1 block truncate text-[10px] text-[#7a888e]">{item.nextAction}</span></span><ArrowUpRight className="size-3.5 shrink-0 text-[#718791] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>)}
          {!linkedItems.length && <div className="border border-dashed border-[#ccd6da] px-3 py-3 text-xs text-[#7b898f]">该节点尚未建立独立事项档案。</div>}
        </div>
      </div>
    </div>
    );
  };

  return (
    <section id="timeline" className="mt-7 scroll-mt-20 border border-[#bfcdd3] bg-white shadow-[0_10px_30px_rgba(31,79,118,.05)] sm:rounded-[10px]" aria-labelledby="timeline-title">
      <div className="flex flex-col gap-3 border-b border-[#dde4e7] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div><p className="text-[10px] font-medium tracking-[0.13em] text-[#879298]">PRIMARY WORKSPACE · 68 DAYS</p><h2 id="timeline-title" className="mt-1.5 text-xl font-semibold">按时间推进工程</h2><p className="mt-1.5 text-xs leading-5 text-[#78858b]">2026 年 8 月 24 日—10 月 30 日。选择节点，查看关联采购、安装条件和下一步。</p></div>
        <div className={`flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[11px] ${timeline.actualCount ? 'border-[#bfd3ca] bg-[#eff6f2] text-[#416557]' : 'border-[#e1cbb8] bg-[#fbf5ef] text-[#795f49]'}`}><CalendarClock className="size-3.5" />{timeline.actualCount ? `${timeline.actualCount} 个节点已有现场确认` : '实际进度待现场确认'}</div>
      </div>

      <div className="grid gap-3 border-b border-[#dde4e7] bg-[#f6f8f9] p-4 sm:grid-cols-[170px_1fr] sm:items-center sm:px-6">
        <div><p className="text-[10px] font-medium tracking-[0.1em] text-[#859197]">今天的计划窗口</p><p className="mt-1 font-data text-sm font-semibold">{currentRows.length} 个节点</p></div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">{currentRows.map((row) => { const state = stateFor(row); const selected = rowKey(row) === selectedKey; return <button key={`${row.kind}:${row.name}`} onClick={() => openTimelineRow(row, true)} aria-expanded={selected} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-[13px] font-medium transition ${selected ? 'border-[#7f9aa6] bg-[#edf3f6] text-[#315e72]' : 'border-[#cbd8de] bg-white text-[#4e626c]'}`}><i className="size-2 rounded-sm" style={{ backgroundColor: state.bar }} />{row.name}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${state.tone}`}>{state.shortLabel}</span><ChevronDown className={`size-3 text-[#79909a] transition ${selected ? 'rotate-180' : ''}`} /></button>; })}</div>
      </div>

      <div className="md:hidden">
        {phaseGroups.map((phase) => { const open = openPhases.includes(phase.name); const completedCount = phase.rows.filter((row) => row.actual?.status === 'completed').length; return <section key={phase.name} className="border-b border-[#e1e6e8] last:border-0"><button onClick={() => togglePhase(phase.name)} className="flex min-h-14 w-full items-center justify-between gap-3 bg-[#edf2f4] px-4 py-3 text-left" aria-expanded={open}><span><strong className="block text-[13px] font-semibold">{phase.name}</strong><span className="mt-1 block font-data text-[10px] text-[#75858c]">{shortRange(phase.range)} · {phase.rows.length} 个节点{completedCount ? ` · ${completedCount} 已完成` : ''}</span></span><ChevronDown className={`size-4 text-[#72858e] transition ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="space-y-2 p-4">{phase.rows.map((row) => { const key = rowKey(row); const selected = key === selectedKey; const state = stateFor(row); return <div data-timeline-row={rowDomToken(row)} key={`${phase.name}:${row.name}`}><button onClick={() => openTimelineRow(row)} aria-expanded={selected} className={`grid min-h-14 w-full grid-cols-[1fr_auto] gap-3 border-l-2 px-3 py-2.5 text-left ${selected ? 'border-[#1f4f76] bg-[#edf3f6]' : 'border-[#8fa5af] bg-[#f7f9fa]'}`}><span><span className="flex flex-wrap items-center gap-2"><strong className="text-sm font-medium leading-5">{row.name}</strong><i className={`rounded-full px-1.5 py-0.5 text-[9px] not-italic ${state.tone}`}>{state.shortLabel}</i></span><span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#77868c]"><Link2 className="size-3" />{row.linkedItemIds.length} 个关联事项 · 点击展开</span></span><span className="flex items-center gap-1 font-data text-[11px] text-[#5f737e]">{row.ranges.map(shortRange).join(' · ')}<ChevronDown className={`size-3 transition ${selected ? 'rotate-180' : ''}`} /></span></button>{selected && rowDetail(row, true)}</div>; })}</div>}</section>; })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[1020px]">
          <div className="grid grid-cols-[330px_1fr] border-b border-[#dfe5e7] bg-[#f7f9fa]">
            <div className="border-r border-[#dfe5e7] px-5 py-3 text-[10px] font-medium tracking-[0.11em] text-[#859096]">工作项目</div>
            <div className="relative h-11">
              {months.map((month) => { const left = ((utcDay(month.start) - startDay) / total) * 100; const width = ((utcDay(month.end) - utcDay(month.start) + 1) / total) * 100; return <div key={month.label} className="absolute top-0 flex h-full items-center justify-center border-r border-[#d7e0e3] text-[11px] font-semibold text-[#60717a]" style={{ left: `${left}%`, width: `${width}%` }}>{month.label}</div>; })}
            </div>
          </div>
          {phaseGroups.map((phase) => { const open = openPhases.includes(phase.name); const completedCount = phase.rows.filter((row) => row.actual?.status === 'completed').length; return <section key={phase.name}>
            <button onClick={() => togglePhase(phase.name)} className="grid min-h-10 w-full grid-cols-[330px_1fr] border-b border-[#dfe5e7] bg-[#edf2f4] text-left" aria-expanded={open}><h3 className="flex items-center justify-between border-r border-[#d7e0e3] px-5 py-2 text-xs font-semibold tracking-[0.06em] text-[#5c707a]"><span>{phase.name}</span><span className="font-data text-[10px] font-normal tracking-normal text-[#7e8d93]">{shortRange(phase.range)} · {phase.rows.length}{completedCount ? ` · ${completedCount} 完成` : ''}</span></h3><div className="flex items-center justify-end px-4"><ChevronDown className={`size-3.5 text-[#71848d] transition ${open ? 'rotate-180' : ''}`} /></div></button>
            {open && phase.rows.map((row) => { const key = rowKey(row); const selected = key === selectedKey; const state = stateFor(row); return <div data-timeline-row={rowDomToken(row)} key={`${phase.name}:${row.name}`} className="border-b border-[#e7ebec] last:border-0"><div className={`grid min-h-11 grid-cols-[330px_1fr] ${selected ? 'bg-[#edf3f6]' : ''}`}>
              <button onClick={() => openTimelineRow(row)} aria-expanded={selected} className="flex items-center justify-between gap-3 border-r border-[#e0e6e8] px-5 py-2.5 text-left text-sm font-medium text-[#526269]"><span className="min-w-0 truncate">{row.name}</span><span className="flex shrink-0 items-center gap-2"><i className={`rounded-full px-1.5 py-0.5 text-[9px] not-italic font-medium ${state.tone}`}>{state.shortLabel}</i><span className="flex items-center gap-1 text-[9px] font-normal text-[#87949a]"><Link2 className="size-2.5" />{row.linkedItemIds.length}</span><ChevronDown className={`size-3 text-[#718791] transition ${selected ? 'rotate-180' : ''}`} /></span></button>
              <div className="relative bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(11.76%_-_1px),#edf1f2_calc(11.76%_-_1px),#edf1f2_11.76%)]">
                {todayOffset >= 0 && todayOffset < total && <span aria-label="今天" className="absolute inset-y-0 z-10 w-px bg-[#dc7440]" style={{ left: `${(todayOffset / total) * 100}%` }} />}
                {row.ranges.map((range, index) => <button onClick={() => openTimelineRow(row)} key={`${range.label}-${index}`} title={`${row.name} · ${state.shortLabel} · 点击展开全部关联事项`} aria-expanded={selected} className="absolute top-1/2 flex h-[18px] -translate-y-1/2 items-center justify-center overflow-hidden rounded-[3px] text-white ring-offset-1 focus-visible:ring-2 focus-visible:ring-[#1f4f76]" style={{ ...barStyle(range), backgroundColor: state.bar }}>{row.actual?.status === 'completed' && <CheckCircle2 className="size-3" />}<span className="sr-only">展开 {row.name} 的全部关联事项：{shortRange(range)}，{state.shortLabel}</span></button>)}
              </div>
            </div>{selected && rowDetail(row)}</div>; })}
          </section>; })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dde4e7] px-5 py-3 text-[11px] text-[#77858b]"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#34698f]" />计划施工</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#db7442]" />计划供应 / 安装</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#3f8067]" />现场已完成</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#2e6d8f]" />现场进行中</span><span className="flex items-center gap-1.5"><i className="h-3 w-px bg-[#dc7440]" />今日</span><span className="ml-auto">点击节点展开全部关联事项，再选择具体档案</span></div>
    </section>
  );
}

const dateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default function Home() {
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const workItemsRef = useRef<HTMLElement>(null);

  const categories = useMemo(() => [...new Set(data.items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'zh-CN')), []);
  const counts = useMemo(() => Object.fromEntries(data.stages.map((entry) => [entry.id, data.items.filter((item) => item.stage === entry.id).length])), []);
  const timelineByItem = useMemo(() => {
    const links = new Map<string, string[]>();
    [...data.timeline.main, ...data.timeline.suppliers].forEach((row) => row.linkedItemIds.forEach((id) => links.set(id, [...(links.get(id) ?? []), row.name])));
    return links;
  }, []);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return data.items.filter((item) => {
      if (stage !== 'all' && item.stage !== stage) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!normalized) return true;
      return [item.name, item.category, item.brand, item.model, item.progress, item.nextAction, ...item.technical.flatMap((record) => record.sections.flatMap((section) => section.points))]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(normalized);
    });
  }, [category, query, stage]);

  const focusResults = () => requestAnimationFrame(() => workItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const setStageAndFocus = (next: Stage) => {
    setStage((current) => current === next ? 'all' : next);
    focusResults();
  };
  const setCategoryAndFocus = (next: string) => {
    setCategory(next);
    focusResults();
  };
  const openItem = (id: string) => {
    setStage('all');
    setCategory('all');
    setQuery('');
    window.history.replaceState(null, '', `#item-${id}`);
    window.setTimeout(() => requestAnimationFrame(() => {
      const target = document.getElementById(`item-${id}`) as HTMLDetailsElement | null;
      if (!target) return;
      target.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }), 0);
  };

  return (
    <main className="min-h-screen bg-[#f4f6f7] text-[#20282d]">
      <header className="border-b border-[#d7dde0] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[8px] bg-[#1f4f76] text-[9px] font-bold tracking-tight text-white">H/OS</span>
            <div><p className="text-sm font-semibold">HomeOS 工程进度</p><p className="mt-0.5 text-[10px] tracking-[0.12em] text-[#818b90]">EXTERNAL COORDINATION BOARD</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-[7px] border border-[#d9e2e7] bg-[#f6f9fa] px-3 py-2 text-[11px] text-[#59707d]"><ShieldCheck className="size-3.5" />脱敏协作版</div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-[#78868d]"><span className="h-px w-8 bg-[#dc7440]" />当前阶段 · {data.project.phase}</div>
            <h1 className="mt-4 max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.055em]">先看现在该做什么，<br />再进入对应事项。</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#68757b]">时间总表是主要入口。选择计划节点即可查看关联采购、型号、安装条件与下一步；实际完成情况只在收到现场确认后更新。</p>
          </div>
          <div className="border-l-2 border-[#1f4f76] bg-white p-4 shadow-[0_1px_0_rgba(32,45,52,.04)] sm:rounded-r-[8px]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium tracking-[0.12em] text-[#879298]">LAST SYNC</span><CheckCircle2 className="size-4 text-[#39715f]" /></div>
            <p className="mt-2 font-data text-sm font-semibold">{dateTime.format(new Date(data.updatedAt))}</p>
            <p className="mt-2 text-xs leading-5 text-[#77848a]">新图纸和尺寸先进入 HomeOS 主记录，核对后同步到此页面。</p>
          </div>
        </section>

        <TimelineBoard onOpenItem={openItem} />

        <section className="mt-7 border-y border-[#cfd7da] py-4" aria-label="工程阶段筛选">
          <div className="relative flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
            <div aria-hidden className="absolute left-[8%] right-[8%] top-[18px] hidden h-px bg-[#c8d1d4] sm:block" />
            {data.stages.map((entry) => {
              const colors = stageColors[entry.id];
              const active = stage === entry.id;
              return (
                <button key={entry.id} onClick={() => setStageAndFocus(entry.id)} className={`relative z-10 flex min-h-11 shrink-0 items-center gap-2 rounded-[7px] border px-3 py-2 text-left transition sm:block sm:border-0 sm:bg-transparent sm:px-2 sm:text-center ${active ? 'border-[#7894a2] bg-white' : 'border-[#dce1e3] bg-[#f8f9f9]'}`} aria-pressed={active}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full font-data text-[10px] font-semibold text-white sm:mx-auto sm:size-9 sm:border-[5px] sm:border-[#f4f6f7] sm:text-[11px]" style={{ backgroundColor: colors.dot }}>{counts[entry.id]}</span>
                  <span className="whitespace-nowrap text-xs font-medium text-[#59666c] sm:mt-2 sm:block">{entry.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="work-items" ref={workItemsRef} className="mt-7 scroll-mt-4 sm:scroll-mt-20">
          <div className="flex flex-col gap-4 border border-[#d7dde0] bg-white p-4 sm:rounded-[10px] sm:p-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[10px] font-medium tracking-[0.13em] text-[#879298]">WORK ITEMS</p><h2 className="mt-1 text-xl font-semibold">工程事项</h2><p className="mt-1 text-xs text-[#818c91]">显示 {filtered.length} / {data.items.length} 项；展开条目查看型号、技术条件和安装资料。</p></div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <select value={category} onChange={(event) => setCategoryAndFocus(event.target.value)} className="h-11 rounded-[7px] border border-[#d5dcdf] bg-white px-3 text-sm text-[#58666c] outline-none focus:border-[#7b9aaa] sm:h-10 sm:w-44" aria-label="按分类筛选">
                <option value="all">全部分类</option>{categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
              <div className="relative flex-1 sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#899399]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索型号、尺寸或安装要求" className="h-10 rounded-[7px] border-[#d5dcdf] bg-white pl-9 shadow-none" /></div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {filtered.map((item) => {
              const colors = stageColors[item.stage];
              const technicalCount = item.technical.reduce((sum, source) => sum + source.sections.reduce((sectionSum, section) => sectionSum + section.points.length, 0), 0);
              const relatedTimeline = timelineByItem.get(item.id) ?? [];
              return (
                <details id={`item-${item.id}`} key={item.id} tabIndex={-1} className="group scroll-mt-4 border border-[#d7dde0] bg-white open:border-[#aebdc3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d91a7] sm:scroll-mt-20 sm:rounded-[9px]">
                  <summary className="grid cursor-pointer list-none gap-3 p-4 marker:hidden sm:grid-cols-[minmax(190px,1.1fr)_minmax(180px,1fr)_175px_115px_24px] sm:items-center sm:gap-5 sm:p-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span>{item.priority && <small className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${priorityStyle(item.priority)}`}>{item.priority}{item.decisionDeadline ? ` · ${item.decisionDeadline.slice(5).replace('-', '/')}` : ''}</small>}<small className="text-[10px] text-[#929b9f]">{item.category}</small></div><p className="mt-1 truncate text-xs text-[#6f7c82]">{[item.brand, item.model].filter(Boolean).join(' · ') || '型号待补充'}</p></div>
                    <div className="min-w-0"><p className="truncate text-xs text-[#57656b]">{item.progress}</p><p className="mt-1 truncate text-[11px] text-[#899397]">下一步：{item.nextAction}</p>{relatedTimeline.length > 0 && <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-[#55798a]"><CalendarClock className="size-3 shrink-0" />关联工程：{relatedTimeline.join('、')}</p>}</div>
                    <span className="w-fit rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: colors.fill, color: colors.text }}><i className="mr-1.5 inline-block size-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />{item.stageLabel}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-[#77858b]"><Wrench className="size-3.5" />{technicalCount ? `${technicalCount} 条技术信息` : '待补技术资料'}</span>
                    <ChevronDown className="size-4 text-[#8a969b] transition group-open:rotate-180" />
                  </summary>

                  <div className="border-t border-[#e0e5e7] bg-[#f9fafb] p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="space-y-4">
                        {item.priority && item.urgencyReason && <div className="border border-[#ead8ca] bg-[#fffaf6] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-medium tracking-[0.1em] text-[#8d705d]">优先级与决策截止</p><span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${priorityStyle(item.priority)}`}>{item.priority}{item.decisionDeadline ? ` · ${item.decisionDeadline.slice(5).replace('-', '/')}` : ''}</span></div><p className="mt-1.5 text-xs leading-6 text-[#66584f]">{item.urgencyReason}</p></div>}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="border-l-2 border-[#2f638c] bg-white p-3"><p className="text-[10px] font-medium tracking-[0.1em] text-[#8a959a]">CURRENT</p><p className="mt-1.5 text-sm leading-6 text-[#4f5e64]">{item.progress}</p></div>
                          <div className="border-l-2 border-[#dc7440] bg-white p-3"><p className="text-[10px] font-medium tracking-[0.1em] text-[#8a959a]">NEXT</p><p className="mt-1.5 text-sm leading-6 text-[#4f5e64]">{item.nextAction}</p></div>
                        </div>

                        {item.technical.map((record) => (
                          <article key={record.source} className="border border-[#dde3e5] bg-white p-4 sm:rounded-[7px]">
                            <p className="font-data text-[10px] text-[#909a9e]">{record.source}</p>
                            {record.sections.map((section) => (
                              <section key={section.title} className="mt-4 border-t border-[#e4e8e9] pt-4 first:mt-2 first:border-0 first:pt-0">
                                <h3 className="text-sm font-semibold">{section.title}</h3>
                                <ul className="mt-2.5 space-y-2">{section.points.map((point, index) => <li key={index} className="grid grid-cols-[7px_1fr] gap-2.5 text-xs leading-6 text-[#59676d]"><span className="mt-[9px] size-1.5 rounded-full bg-[#7f969f]" /><span>{point}</span></li>)}</ul>
                              </section>
                            ))}
                          </article>
                        ))}
                        {!item.technical.length && <div className="border border-dashed border-[#ccd5d8] bg-white p-5 text-sm leading-6 text-[#7c888d] sm:rounded-[7px]"><Info className="mr-2 inline size-4" />详细型号或安装资料尚未进入 HomeOS；取得后会同步到这里。</div>}
                      </div>

                      <aside>
                        <p className="text-[10px] font-medium tracking-[0.11em] text-[#8a959a]">TECHNICAL FILES</p>
                        <div className="mt-2 space-y-2">
                          {item.assets.map((asset) => <a key={asset.href} href={asset.href} target="_blank" rel="noreferrer" className="group/file block overflow-hidden border border-[#dbe1e3] bg-white sm:rounded-[7px]">{asset.type === 'image' ? <div className="aspect-[16/10] overflow-hidden bg-[#e9eef0]"><img src={asset.href} alt={asset.title} className="h-full w-full object-cover transition group-hover/file:scale-[1.01]" /></div> : <div className="grid aspect-[16/9] place-items-center bg-[#e9eef0]"><FileText className="size-8 text-[#708791]" /></div>}<div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs font-medium">{asset.title}</span><ArrowUpRight className="size-3.5 shrink-0 text-[#72848b]" /></div></a>)}
                          {!item.assets.length && <div className="border border-dashed border-[#d1d9dc] p-4 text-xs leading-5 text-[#839095] sm:rounded-[7px]"><ImageIcon className="mb-2 size-4" />暂无可公开的技术图纸附件。</div>}
                        </div>
                      </aside>
                    </div>
                  </div>
                </details>
              );
            })}
            {!filtered.length && <div className="border border-dashed border-[#cdd6d9] bg-white py-16 text-center text-sm text-[#7d898e]">没有找到符合条件的工程事项。</div>}
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[#d2d9dc] py-6 text-[11px] text-[#7f8a8f] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-1.5"><ClipboardCheck className="size-3.5" />HomeOS 工程协作版</span><span>仅展示工程进度、型号、尺寸、安装与验收信息</span></footer>
      </div>
    </main>
  );
}
