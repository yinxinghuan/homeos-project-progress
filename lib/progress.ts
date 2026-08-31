import progressData from '@/data/progress.json';

export type Stage = 'ordered' | 'confirmed' | 'selected' | 'coordination' | 'planning';
export type TechnicalSection = { title: string; points: string[] };
export type ProgressItem = {
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
  drawingAudit: { status: 'complete' | 'partial' | 'missing' | 'pending_selection'; label: string; note: string; nextAction: string } | null;
  technical: { source: string; sections: TechnicalSection[] }[];
  assets: { title: string; href: string; type: 'pdf' | 'image' }[];
};
export type TimelineRange = { start: string; end: string; label: string };
export type TimelineActual = { status: 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'blocked'; confirmedDate: string | null; note: string | null };
export type TimelineRow = { name: string; kind: 'construction' | 'supplier'; linkedItemIds: string[]; actual: TimelineActual | null; ranges: TimelineRange[] };

export const data = progressData as {
  updatedAt: string;
  project: { title: string; phase: string };
  stages: { id: Stage; label: string }[];
  items: ProgressItem[];
  timeline: { title: string; start: string; end: string; durationDays: number; source: string; trackingSource: string; actualStatus: 'not_confirmed' | 'recorded'; actualCount: number; phases: { name: string; range: TimelineRange; focus: string }[]; main: TimelineRow[]; suppliers: TimelineRow[] };
};

export const stageColors: Record<Stage, { dot: string; fill: string; text: string }> = {
  ordered: { dot: '#2c6a58', fill: '#e5f0eb', text: '#315d50' },
  confirmed: { dot: '#2d5f8b', fill: '#e5edf5', text: '#355f81' },
  selected: { dot: '#7b6b42', fill: '#f0ecdf', text: '#6c5d36' },
  coordination: { dot: '#9a613d', fill: '#f4e9e2', text: '#80543a' },
  planning: { dot: '#8a9194', fill: '#eceeef', text: '#666e71' },
};

export const priorityStyle = (priority: ProgressItem['priority']) => priority === 'P0'
  ? 'border-[#dba98f] bg-[#fff1e9] text-[#8a482c]'
  : priority === 'P1'
    ? 'border-[#ddc99e] bg-[#fbf5e8] text-[#765d27]'
    : 'border-[#cbd6da] bg-[#f1f5f6] text-[#5f737b]';

export function shortRange(range: TimelineRange) {
  const format = (value: string) => `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}`;
  return range.start === range.end ? format(range.start) : `${format(range.start)}—${format(range.end)}`;
}

export const dateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
