import { todayISO } from './logic';
import type { Item, Kind, Pillar, Stage } from './types';

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return todayISO(d);
};

type Row = [string, string, Stage, Kind, Pillar, string, string, number | null, number | null, number | null, string, string, number?, number?, number?, number?, number?];

/** Fictional items so a first-time visitor sees every stage working. Dates are relative to today. */
export function demoItems(): Item[] {
  const rows: Row[] = [
    // id, title, stage, kind, pillar, tier, format, created, published, slot (day offsets), card, note, impr, day, react, comment, save
    ['D-1', 'Example idea: what a pilot never tells you about scale', 'Idea', 'brand', 'P2', '', '', -3, null, null, '', 'Demo item. Replace with your own from the Data menu.'],
    ['D-2', 'Example idea: three questions before buying a platform', 'Idea', 'brand', 'P3', '', '', -9, null, null, '', ''],
    ['D-3', 'Example idea: who owns the decision after go-live?', 'Idea', 'brand', 'P1', '', '', -14, null, null, '', ''],
    ['D-4', 'Example draft: the handover nobody budgets for', 'Drafted', 'brand', 'P1', 'flagship', 'Text', -12, null, 4, 'built', ''],
    ['D-5', 'Example draft: a dashboard is a question, not an answer', 'Drafted', 'brand', 'P2', 'flagship', 'Carousel', -20, null, -5, 'needs card', 'Missed its slot. Reschedule from the calendar.'],
    ['D-6', 'Example draft: automation that removes the wrong step', 'Drafted', 'brand', 'P4', 'fast', 'Text', -6, null, null, 'spec only', ''],
    ['D-7', 'Example scheduled: standards are a design tool', 'Scheduled', 'brand', 'P3', 'flagship', 'Video', -8, null, 2, 'built', ''],
    ['D-8', 'Example published: the cost of a second site', 'Published', 'brand', 'P3', 'flagship', 'Text', -15, -3, -3, 'built', 'Log the 7-day read when it is in.'],
    ['D-9', 'Example measured: governance needs a named owner', 'Measured', 'brand', 'P4', 'flagship', 'Text', -40, -30, null, 'built', '', 1240, 7, 21, 6, 3],
    ['D-10', 'Example measured: boring before clever', 'Measured', 'brand', 'P3', 'fast', 'Text', -30, -22, null, '', '', 860, 5, 14, 2, 1],
    ['D-11', 'Example measured: decision rights beat data quality', 'Measured', 'brand', 'P1', 'flagship', 'Carousel', -60, -48, null, 'built', '', 510, 6, 9, 1, 0],
    ['D-12', 'Example measured: hiring post', 'Measured', 'hiring', '', '', 'Hiring', -20, -18, null, '', 'Hiring posts are hidden until you switch them on.', 2900, 4, 30, 1, 2],
    ['D-13', 'Example stale: superseded by a later post', 'Stale', 'brand', 'P2', 'flagship', 'Text', -120, null, null, '', ''],
  ];
  return rows.map((r) => ({
    id: r[0], title: r[1], stage: r[2], kind: r[3], pillar: r[4], tier: r[5], format: r[6], reach: r[6] ? 'own' : '',
    created: r[7] === null ? '' : iso(r[7]), published: r[8] === null ? '' : iso(r[8]), slot: r[9] === null ? '' : iso(r[9]),
    card: r[10], note: r[11], body: '',
    impr: r[12] ?? null, day: r[13] ?? null, react: r[14] ?? null, comment: r[15] ?? null, save: r[16] ?? null,
  }));
}
