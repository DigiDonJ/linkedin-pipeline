import { ALL_STAGES, isISODate } from './logic';
import type { Item, Pillar, Stage } from './types';

export const SCHEMA_VERSION = 1;
const FIELDS: (keyof Item)[] = [
  'id', 'title', 'stage', 'kind', 'pillar', 'tier', 'format', 'reach', 'created', 'published', 'slot', 'card', 'note', 'body',
  'impr', 'day', 'react', 'comment', 'save',
];
const NUMERIC = new Set<keyof Item>(['impr', 'day', 'react', 'comment', 'save']);

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const date = (v: unknown) => (isISODate(v) ? v : '');
const numOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/** Coerce anything row-shaped into a valid Item, or null when it has no id or title. */
export function normalise(raw: unknown): Item | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id).trim();
  const title = str(r.title).trim();
  if (!id || !title) return null;
  const stage = (ALL_STAGES as string[]).includes(str(r.stage)) ? (r.stage as Stage) : 'Idea';
  const pillar = ['P1', 'P2', 'P3', 'P4'].includes(str(r.pillar)) ? (r.pillar as Pillar) : '';
  return {
    id, title, stage, pillar,
    kind: r.kind === 'hiring' ? 'hiring' : 'brand',
    tier: str(r.tier), format: str(r.format), reach: str(r.reach),
    created: date(r.created), published: date(r.published), slot: date(r.slot),
    card: str(r.card), note: str(r.note), body: str(r.body),
    impr: numOrNull(r.impr), day: numOrNull(r.day), react: numOrNull(r.react), comment: numOrNull(r.comment), save: numOrNull(r.save),
  };
}

export const toJSON = (items: Item[], exported = new Date().toISOString()) =>
  JSON.stringify({ app: 'linkedin-pipeline', version: SCHEMA_VERSION, exported, items }, null, 2);

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (items: Item[]) =>
  [FIELDS.join(','), ...items.map((it) => FIELDS.map((f) => cell(it[f])).join(','))].join('\r\n') + '\r\n';

/** RFC 4180 parser: quoted cells, doubled quotes, newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export interface Parsed { items: Item[]; skipped: number }

/** Accepts this app's JSON export, a bare JSON array of items, or a CSV with a header row. */
export function parseImport(text: string): Parsed {
  const t = text.trim();
  if (!t) throw new Error('The file is empty.');
  let rows: unknown[];
  if (t[0] === '{' || t[0] === '[') {
    let data: unknown;
    try { data = JSON.parse(t); } catch { throw new Error('That file is not valid JSON.'); }
    const list = Array.isArray(data) ? data : (data as { items?: unknown }).items;
    if (!Array.isArray(list)) throw new Error('No "items" list found in that file.');
    rows = list;
  } else {
    const [head, ...body] = parseCSV(t);
    const cols = head.map((h) => h.trim());
    if (!cols.includes('id') || !cols.includes('title')) throw new Error('The CSV needs "id" and "title" columns.');
    rows = body.map((r) => Object.fromEntries(cols.map((c, i) => [c, NUMERIC.has(c as keyof Item) && r[i] === '' ? null : r[i]])));
  }
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const raw of rows) {
    const it = normalise(raw);
    if (!it || seen.has(it.id)) continue;
    seen.add(it.id);
    items.push(it);
  }
  if (!items.length) throw new Error('No usable items in that file.');
  return { items, skipped: rows.length - items.length };
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
