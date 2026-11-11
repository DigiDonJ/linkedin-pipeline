import { describe, expect, it } from 'vitest';
import { normalise, parseCSV, parseImport, toCSV, toJSON } from './io';
import {
  SORTERS, calendarDate, decorate, groupBy, median, monthGrid, nextStage, perMonth, prevStage, shiftMonth, topId, visible,
  waitingCount, withSlot, withStage, wordCount,
} from './logic';
import type { Filters, Item } from './types';

const mk = (p: Partial<Item>): Item => ({
  id: 'x', title: 'T', stage: 'Idea', kind: 'brand', pillar: '', tier: '', format: '', reach: '', created: '', published: '', slot: '',
  card: '', note: '', body: '', impr: null, day: null, react: null, comment: null, save: null, ...p,
});
const F: Filters = { pillar: 'All', hiring: false, stale: false, query: '' };
const TODAY = '2026-11-11';

describe('visible', () => {
  const items = [
    mk({ id: 'a', pillar: 'P1', title: 'Alpha' }),
    mk({ id: 'b', kind: 'hiring', title: 'Hiring' }),
    mk({ id: 'c', stage: 'Stale', pillar: 'P1' }),
    mk({ id: 'd', pillar: 'P2', note: 'needs ALPHA check' }),
    mk({ id: 'e', pillar: 'P3', body: 'alpha in the draft text' }),
  ];
  it('hides hiring and stale by default', () => expect(visible(items, F).map((i) => i.id)).toEqual(['a', 'd', 'e']));
  it('shows them when switched on', () => expect(visible(items, { ...F, hiring: true, stale: true })).toHaveLength(5));
  it('filters by pillar', () => expect(visible(items, { ...F, pillar: 'P1', stale: true }).map((i) => i.id)).toEqual(['a', 'c']));
  it('searches title, note and body, case-insensitively', () =>
    expect(visible(items, { ...F, query: ' alpha ' }).map((i) => i.id)).toEqual(['a', 'd', 'e']));
  it('counts finished drafts waiting', () =>
    expect(waitingCount([mk({ stage: 'Drafted' }), mk({ stage: 'Scheduled' }), mk({ stage: 'Idea' }), mk({ stage: 'Stale' })])).toBe(2));
});

describe('sorters', () => {
  const ids = (xs: Item[]) => xs.map((x) => x.id);
  it('ideas newest first, drafts oldest first', () => {
    const xs = [mk({ id: 'a', created: '2026-10-01' }), mk({ id: 'b', created: '2026-11-01' })];
    expect(ids([...xs].sort(SORTERS.Idea))).toEqual(['b', 'a']);
    expect(ids([...xs].sort(SORTERS.Drafted))).toEqual(['a', 'b']);
  });
  it('scheduled soonest first, measured latest first', () => {
    const xs = [mk({ id: 'a', slot: '2026-11-20', published: '2026-07-01' }), mk({ id: 'b', slot: '2026-11-12', published: '2026-08-01' })];
    expect(ids([...xs].sort(SORTERS.Scheduled))).toEqual(['b', 'a']);
    expect(ids([...xs].sort(SORTERS.Measured))).toEqual(['b', 'a']);
  });
  it('is stable on ties', () => {
    const xs = [mk({ id: 'b', created: '2026-10-01' }), mk({ id: 'a', created: '2026-10-01' })];
    expect(ids([...xs].sort(SORTERS.Idea))).toEqual(['a', 'b']);
  });
});

describe('decorate', () => {
  it('flags an overdue draft and a missing card', () => {
    const d = decorate(mk({ stage: 'Drafted', slot: '2026-11-10', created: '2026-11-01', card: 'spec only' }), TODAY, null);
    expect(d).toMatchObject({ tag: '1 day over', tone: 'strong', overdue: true, flag: 'Card: spec only', when: '10d' });
    expect(decorate(mk({ stage: 'Drafted', slot: '2026-10-27' }), TODAY, null).tag).toBe('15 days over');
  });
  it('shows an upcoming or same-day slot in teal', () => {
    expect(decorate(mk({ stage: 'Drafted', slot: '2026-11-12' }), TODAY, null)).toMatchObject({ tag: 'Slot Thu 12 Nov', tone: 'teal', overdue: false });
    expect(decorate(mk({ stage: 'Drafted', slot: TODAY }), TODAY, null).overdue).toBe(false);
    expect(decorate(mk({ stage: 'Drafted' }), TODAY, null)).toMatchObject({ tag: 'No slot', tone: 'dim' });
  });
  it('gives gold to the top brand post only', () => {
    const a = mk({ id: 'a', stage: 'Measured', impr: 1356, day: 1, published: '2026-10-08' });
    const b = mk({ id: 'b', stage: 'Measured', impr: 3255, day: 6, kind: 'hiring' });
    const c = mk({ id: 'c', stage: 'Measured', impr: 992, day: 3 });
    const top = topId([a, b, c]);
    expect(top).toBe('a');
    expect(decorate(a, TODAY, top)).toMatchObject({ tag: '1,356 impr · day 1', tone: 'gold', when: '8 Oct' });
    expect(decorate(c, TODAY, top).tone).toBe('strong');
    expect(decorate(mk({ stage: 'Measured' }), TODAY, top).tag).toBe('No 7-day read');
  });
  it('labels the other stages', () => {
    expect(decorate(mk({ stage: 'Published', published: '2026-10-15' }), TODAY, null)).toMatchObject({ tag: 'Awaiting read', when: '15 Oct' });
    expect(decorate(mk({ stage: 'Scheduled', slot: TODAY }), TODAY, null)).toMatchObject({ tag: 'Wed 11 Nov', tone: 'teal' });
    expect(decorate(mk({ stage: 'Scheduled' }), TODAY, null).tag).toBe('No date');
  });
});

describe('stage moves', () => {
  it('walks the pipeline and back', () => {
    expect(nextStage('Idea')).toBe('Drafted');
    expect(nextStage('Measured')).toBeNull();
    expect(nextStage('Stale')).toBeNull();
    expect(prevStage('Idea')).toBeNull();
    expect(prevStage('Stale')).toBe('Drafted');
  });
  it('stamps the published date once', () => {
    expect(withStage(mk({ stage: 'Scheduled' }), 'Published', TODAY).published).toBe(TODAY);
    expect(withStage(mk({ published: '2026-10-01' }), 'Measured', TODAY).published).toBe('2026-10-01');
    expect(withStage(mk({}), 'Drafted', TODAY).published).toBe('');
  });
  it('scheduling a draft moves it to Scheduled, a live post keeps its stage', () => {
    expect(withSlot(mk({ stage: 'Drafted' }), '2026-11-20')).toMatchObject({ slot: '2026-11-20', stage: 'Scheduled' });
    expect(withSlot(mk({ stage: 'Published' }), '2026-11-20').stage).toBe('Published');
  });
});

describe('analytics', () => {
  const items = [
    mk({ pillar: 'P1', impr: 100, published: '2026-07-02' }),
    mk({ pillar: 'P1', impr: 301, published: '2026-07-20' }),
    mk({ pillar: 'P3', impr: 50, published: '2026-09-01', kind: 'hiring' }),
    mk({ pillar: 'P3', published: '2026-09-05' }),
    mk({ impr: 10 }),
  ];
  it('groups and averages, skipping unread and unkeyed items', () =>
    expect(groupBy(items, (i) => i.pillar)).toEqual([{ key: 'P1', n: 2, total: 401, avg: 201 }, { key: 'P3', n: 1, total: 50, avg: 50 }]));
  it('finds the median', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(3);
    expect(median([])).toBeNull();
  });
  it('counts posts per month and fills gaps', () =>
    expect(perMonth(items)).toEqual([
      { month: '2026-07', brand: 2, hiring: 0 }, { month: '2026-08', brand: 0, hiring: 0 }, { month: '2026-09', brand: 1, hiring: 1 },
    ]));
  it('counts words', () => { expect(wordCount('  one two\nthree ')).toBe(3); expect(wordCount('  ')).toBe(0); });
});

describe('calendar', () => {
  it('builds Monday-first weeks covering the month', () => {
    const g = monthGrid('2026-11');
    expect(g[0]).toBe('2026-10-26');
    expect(g).toHaveLength(42);
    expect(g).toContain('2026-11-30');
    expect(monthGrid('2027-02')).toHaveLength(28);
  });
  it('shifts across year ends', () => { expect(shiftMonth('2026-12', 1)).toBe('2027-01'); expect(shiftMonth('2026-01', -1)).toBe('2025-12'); });
  it('places items on the right date', () => {
    expect(calendarDate(mk({ stage: 'Measured', published: '2026-10-08', slot: '2026-10-01' }))).toBe('2026-10-08');
    expect(calendarDate(mk({ stage: 'Drafted', slot: '2026-11-12' }))).toBe('2026-11-12');
    expect(calendarDate(mk({ stage: 'Idea', slot: '2026-11-12' }))).toBe('');
  });
});

describe('import and export', () => {
  const items = [
    mk({ id: 'a', title: 'Has, comma and "quotes"', note: 'line one\nline two', impr: 0, day: 2, stage: 'Measured', pillar: 'P4' }),
    mk({ id: 'b', title: 'Plain', created: '2026-10-01', body: 'Draft text.' }),
  ];
  it('round-trips JSON', () => expect(parseImport(toJSON(items)).items).toEqual(items));
  it('round-trips CSV, keeping zero distinct from empty', () => {
    const back = parseImport(toCSV(items)).items;
    expect(back).toEqual(items);
    expect(back[0].impr).toBe(0);
    expect(back[1].impr).toBeNull();
  });
  it('parses quoted CSV cells', () => expect(parseCSV('a,b\r\n"x,1","y ""z"""\r\n')).toEqual([['a', 'b'], ['x,1', 'y "z"']]));
  it('accepts a bare array, repairs bad fields, drops bad and duplicate rows', () => {
    const r = parseImport(JSON.stringify([
      { id: 'a', title: 'A', stage: 'Nope', pillar: 'P9', created: '11/11/2026', impr: '42', save: -1 },
      { id: 'a', title: 'Duplicate' }, { title: 'No id' }, null,
    ]));
    expect(r.skipped).toBe(3);
    expect(r.items[0]).toMatchObject({ stage: 'Idea', pillar: '', created: '', impr: 42, save: null, kind: 'brand', body: '' });
  });
  it('rejects junk with a readable message', () => {
    expect(() => parseImport('')).toThrow('empty');
    expect(() => parseImport('{oops')).toThrow('not valid JSON');
    expect(() => parseImport('{"foo":1}')).toThrow('items');
    expect(() => parseImport('name,when\nx,y')).toThrow('"id" and "title"');
    expect(() => parseImport('[]')).toThrow('No usable items');
  });
  it('normalise rejects non-objects', () => expect(normalise('x')).toBeNull());
});
