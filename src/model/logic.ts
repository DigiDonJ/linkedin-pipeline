import type { Filters, Item, Stage } from './types';

export const STAGES: Stage[] = ['Idea', 'Drafted', 'Scheduled', 'Published', 'Measured'];
export const ALL_STAGES: Stage[] = [...STAGES, 'Stale'];
export const STAGE_NAMES: Record<Stage, string> = {
  Idea: 'Ideas', Drafted: 'Drafted', Scheduled: 'Scheduled', Published: 'Published', Measured: 'Measured', Stale: 'Stale',
};
export const PILLARS: Record<string, string> = {
  P1: 'P1 Executive leadership',
  P2: 'P2 Digital transformation: hard outcomes',
  P3: 'P3 Smart manufacturing and tech strategy',
  P4: 'P4 AI',
};
export const PILLAR_KEYS = ['P1', 'P2', 'P3', 'P4'] as const;
export const FORMATS = ['Text', 'Carousel', 'Video', 'Reshare', 'Hiring'];
export const TIERS = ['flagship', 'fast'];
export const CARD_STATES = ['built', 'needs card', 'spec only', 'none by design'];

const pad = (n: number) => String(n).padStart(2, '0');
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayNum = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 864e5;
export const isISODate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dayNum(s));
export const num = (n: number) => Number(n).toLocaleString('en-GB');
export const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtW = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function visible(items: Item[], f: Filters): Item[] {
  const q = f.query.trim().toLowerCase();
  return items.filter(
    (it) =>
      (f.hiring || it.kind !== 'hiring') &&
      (f.stale || it.stage !== 'Stale') &&
      (f.pillar === 'All' || it.pillar === f.pillar) &&
      (!q || `${it.title} ${it.note} ${it.body}`.toLowerCase().includes(q)),
  );
}

/** Finished drafts not yet out: the number the header leads with. */
export const waitingCount = (items: Item[]) =>
  items.filter((it) => it.stage === 'Drafted' || it.stage === 'Scheduled').length;

const by = (key: 'created' | 'slot' | 'published', dir: 1 | -1) => (a: Item, b: Item) =>
  a[key] === b[key] ? a.id.localeCompare(b.id) : a[key] < b[key] ? -dir : dir;

export const SORTERS: Record<Stage, (a: Item, b: Item) => number> = {
  Idea: by('created', -1),
  Drafted: by('created', 1),
  Scheduled: by('slot', 1),
  Published: by('published', -1),
  Measured: by('published', -1),
  Stale: by('created', -1),
};

/** The best-performing brand post. It is the one gold element on the board. */
export function topId(items: Item[]): string | null {
  let best: Item | null = null;
  for (const it of items) {
    if (it.kind === 'brand' && it.impr !== null && (!best || it.impr > best.impr!)) best = it;
  }
  return best ? best.id : null;
}

export type Tone = 'dim' | 'strong' | 'teal' | 'gold';
export interface Decoration { tag: string; tone: Tone; flag: string; when: string; overdue: boolean }

export function decorate(it: Item, today: string, top: string | null): Decoration {
  let tag = '', tone: Tone = 'dim', flag = '', when = '', overdue = false;
  const t = dayNum(today);
  if (it.stage === 'Idea') {
    tag = 'Idea';
    when = it.created ? fmt(it.created) : '';
  } else if (it.stage === 'Drafted') {
    const over = it.slot ? t - dayNum(it.slot) : null;
    if (over !== null && over > 0) { tag = `${over} ${over === 1 ? 'day' : 'days'} over`; tone = 'strong'; overdue = true; }
    else if (over !== null) { tag = `Slot ${fmtW(it.slot)}`; tone = 'teal'; }
    else tag = 'No slot';
    if (it.card === 'spec only' || it.card === 'needs card') flag = `Card: ${it.card}`;
    when = it.created ? `${Math.max(0, t - dayNum(it.created))}d` : '';
  } else if (it.stage === 'Scheduled') {
    tag = it.slot ? fmtW(it.slot) : 'No date';
    tone = 'teal';
  } else if (it.stage === 'Published') {
    tag = 'Awaiting read';
    when = it.published ? fmt(it.published) : '';
  } else if (it.stage === 'Measured') {
    if (it.impr !== null) {
      tag = `${num(it.impr)} impr${it.day !== null ? ` · day ${it.day}` : ''}`;
      tone = it.id === top ? 'gold' : 'strong';
    } else tag = 'No 7-day read';
    when = it.published ? fmt(it.published) : '';
  } else {
    tag = 'Stale';
    when = it.created ? fmt(it.created) : '';
  }
  return { tag, tone, flag, when, overdue };
}

export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}
export function prevStage(stage: Stage): Stage | null {
  if (stage === 'Stale') return 'Drafted';
  const i = STAGES.indexOf(stage);
  return i > 0 ? STAGES[i - 1] : null;
}
export const canStale = (stage: Stage) => stage === 'Idea' || stage === 'Drafted' || stage === 'Scheduled';

/** Stage change, filling the published date the first time a post goes out. */
export function withStage(it: Item, stage: Stage, today: string): Item {
  const published = (stage === 'Published' || stage === 'Measured') && !it.published ? today : it.published;
  return { ...it, stage, published };
}

/** Giving a draft a date schedules it. Posts already out keep their stage. */
export function withSlot(it: Item, slot: string): Item {
  const stage: Stage = it.stage === 'Idea' || it.stage === 'Drafted' || it.stage === 'Stale' ? 'Scheduled' : it.stage;
  return { ...it, slot, stage };
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// ---------- analytics ----------

export interface Group { key: string; n: number; total: number; avg: number }

export function groupBy(items: Item[], keyOf: (it: Item) => string): Group[] {
  const m = new Map<string, { n: number; total: number }>();
  for (const it of items) {
    if (it.impr === null) continue;
    const k = keyOf(it);
    if (!k) continue;
    const g = m.get(k) ?? { n: 0, total: 0 };
    g.n += 1; g.total += it.impr;
    m.set(k, g);
  }
  return [...m].map(([key, g]) => ({ key, n: g.n, total: g.total, avg: Math.round(g.total / g.n) }));
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Posts published per calendar month, oldest first, gaps filled with zero. */
export function perMonth(items: Item[]): { month: string; brand: number; hiring: number }[] {
  const dated = items.filter((it) => it.published && it.stage !== 'Stale');
  if (!dated.length) return [];
  const months = dated.map((it) => it.published.slice(0, 7)).sort();
  const out: { month: string; brand: number; hiring: number }[] = [];
  let [y, m] = months[0].split('-').map(Number);
  const last = months[months.length - 1];
  for (;;) {
    const key = `${y}-${pad(m)}`;
    const inMonth = dated.filter((it) => it.published.startsWith(key));
    out.push({ month: key, brand: inMonth.filter((it) => it.kind === 'brand').length, hiring: inMonth.filter((it) => it.kind === 'hiring').length });
    if (key >= last) break;
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export const monthLabel = (ym: string, long = false) =>
  new Date(ym + '-01T00:00:00Z').toLocaleDateString('en-GB', long ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' });

// ---------- calendar ----------

/** Six-week grid of ISO dates covering the month, weeks starting Monday. */
export function monthGrid(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysIn) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(Date.UTC(y, m - 1, 1 - lead + i)).toISOString().slice(0, 10));
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** The date an item sits on in the calendar: when it went out, else when it is planned. */
export const calendarDate = (it: Item) =>
  it.stage === 'Published' || it.stage === 'Measured' ? it.published : it.stage === 'Drafted' || it.stage === 'Scheduled' ? it.slot : '';
