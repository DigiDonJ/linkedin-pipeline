import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoItems } from './demo';
import { SCHEMA_VERSION, normalise } from './io';
import { STAGE_NAMES, fmtW, todayISO, withSlot, withStage } from './logic';
import type { Filters, Item, Pillar, Stage } from './types';

const HISTORY = 30;

interface Snapshot { items: Item[]; isDemo: boolean }

interface PipelineState {
  items: Item[];
  /** True until the user imports or clears: drives the demo banner. */
  isDemo: boolean;
  past: Snapshot[];
  /** Save a restore point. Called before a run of field edits and by every discrete action. */
  checkpoint: () => void;
  add: (title: string, pillar: Pillar) => string;
  update: (id: string, patch: Partial<Item>) => void;
  move: (id: string, stage: Stage) => void;
  schedule: (id: string, slot: string) => void;
  remove: (id: string) => void;
  replaceAll: (items: Item[]) => void;
  merge: (items: Item[]) => void;
  loadDemo: () => void;
  clear: () => void;
  undo: () => void;
}

const newId = (items: Item[]) => {
  const stamp = todayISO().slice(2).replace(/-/g, '');
  let n = 1;
  while (items.some((it) => it.id === `N-${stamp}-${n}`)) n++;
  return `N-${stamp}-${n}`;
};

export const usePipeline = create<PipelineState>()(
  persist(
    (set, get) => ({
      items: demoItems(),
      isDemo: true,
      past: [],
      checkpoint: () => {
        const { items, isDemo, past } = get();
        if (past.length && past[past.length - 1].items === items) return;
        set({ past: [...past, { items, isDemo }].slice(-HISTORY) });
      },
      add: (title, pillar) => {
        get().checkpoint();
        const id = newId(get().items);
        const item: Item = {
          id, title, stage: 'Idea', kind: 'brand', pillar, tier: '', format: '', reach: '', created: todayISO(), published: '', slot: '',
          card: '', note: '', body: '', impr: null, day: null, react: null, comment: null, save: null,
        };
        set((s) => ({ items: [...s.items, item] }));
        return id;
      },
      update: (id, patch) => set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch, id } : it)) })),
      move: (id, stage) => {
        const cur = get().items.find((it) => it.id === id);
        if (!cur || cur.stage === stage) return;
        get().checkpoint();
        set((s) => ({ items: s.items.map((it) => (it.id === id ? withStage(it, stage, todayISO()) : it)) }));
      },
      schedule: (id, slot) => {
        get().checkpoint();
        set((s) => ({ items: s.items.map((it) => (it.id === id ? withSlot(it, slot) : it)) }));
      },
      remove: (id) => {
        get().checkpoint();
        set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
      },
      replaceAll: (items) => { get().checkpoint(); set({ items, isDemo: false }); },
      merge: (incoming) => {
        get().checkpoint();
        set((s) => {
          const base = s.isDemo ? [] : s.items;
          const ids = new Set(incoming.map((it) => it.id));
          return { items: [...base.filter((it) => !ids.has(it.id)), ...incoming], isDemo: false };
        });
      },
      loadDemo: () => { get().checkpoint(); set({ items: demoItems(), isDemo: true }); },
      clear: () => { get().checkpoint(); set({ items: [], isDemo: false }); },
      undo: () => {
        const { past } = get();
        if (!past.length) return;
        const last = past[past.length - 1];
        set({ items: last.items, isDemo: last.isDemo, past: past.slice(0, -1) });
      },
    }),
    {
      name: 'linkedin-pipeline',
      version: SCHEMA_VERSION,
      partialize: (s) => ({ items: s.items, isDemo: s.isDemo }),
      // Re-validate whatever an older build stored, so a schema change never loads a broken row.
      migrate: (stored) => {
        const s = (stored ?? {}) as { items?: unknown[]; isDemo?: boolean };
        return { items: (s.items ?? []).map(normalise).filter((x): x is Item => !!x), isDemo: !!s.isDemo };
      },
    },
  ),
);

export type View = 'board' | 'calendar' | 'analytics';
interface Toast { id: number; msg: string; undo: boolean }

interface UiState extends Filters {
  view: View;
  sel: string | null;
  toast: Toast | null;
  set: (patch: Partial<Pick<UiState, 'view' | 'sel' | 'pillar' | 'hiring' | 'stale' | 'query'>>) => void;
  say: (msg: string, undo?: boolean) => void;
  dismiss: () => void;
}

let toastSeq = 0;
export const useUi = create<UiState>()((set) => ({
  view: 'board', sel: null, toast: null,
  pillar: 'All', hiring: false, stale: false, query: '',
  set: (patch) => set(patch),
  say: (msg, undo = false) => set({ toast: { id: ++toastSeq, msg, undo } }),
  dismiss: () => set({ toast: null }),
}));

// Actions that pair a data change with its confirmation, shared by the board, calendar and drawer.
export function moveItem(id: string, stage: Stage) {
  const before = usePipeline.getState().items.find((it) => it.id === id);
  if (!before || before.stage === stage) return;
  usePipeline.getState().move(id, stage);
  if (stage === 'Stale') useUi.getState().set({ stale: true });
  useUi.getState().say(`Moved to ${STAGE_NAMES[stage]}.`, true);
}

export function scheduleItem(id: string, slot: string) {
  const before = usePipeline.getState().items.find((it) => it.id === id);
  if (!before || (before.slot === slot && before.stage === 'Scheduled')) return;
  usePipeline.getState().schedule(id, slot);
  useUi.getState().say(`Scheduled for ${fmtW(slot)}.`, true);
}
