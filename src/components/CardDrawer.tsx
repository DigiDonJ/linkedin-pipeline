import { useEffect, useRef } from 'react';
import { CARD_STATES, FORMATS, PILLARS, PILLAR_KEYS, STAGE_NAMES, TIERS, canStale, nextStage, prevStage, wordCount } from '../model/logic';
import { moveItem, usePipeline, useUi } from '../model/store';
import type { Item, Pillar } from '../model/types';

const METRICS: { key: 'impr' | 'day' | 'react' | 'comment' | 'save'; label: string }[] = [
  { key: 'impr', label: 'Impressions' },
  { key: 'day', label: 'Read on day' },
  { key: 'react', label: 'Reactions' },
  { key: 'comment', label: 'Comments' },
  { key: 'save', label: 'Saves' },
];

/** Keeps values the fixed lists do not know about (imported data) selectable. */
const withCurrent = (options: string[], current: string) => (current && !options.includes(current) ? [current, ...options] : options);

export default function CardDrawer({ item }: { item: Item }) {
  const update = usePipeline((s) => s.update);
  const remove = usePipeline((s) => s.remove);
  const checkpoint = usePipeline((s) => s.checkpoint);
  const set = useUi((s) => s.set);
  const say = useUi((s) => s.say);
  const ref = useRef<HTMLElement>(null);

  const close = () => set({ sel: null });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const patch = (p: Partial<Item>) => update(item.id, p);
  const text = (key: 'title' | 'reach' | 'note' | 'body' | 'tier' | 'format' | 'card' | 'slot' | 'published' | 'created') => ({
    value: item[key],
    onFocus: checkpoint,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => patch({ [key]: e.target.value }),
  });
  const next = nextStage(item.stage);
  const back = prevStage(item.stage);
  const out = item.stage === 'Published' || item.stage === 'Measured';
  const words = wordCount(item.body);

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside ref={ref} className="drawer" aria-label="Card details" tabIndex={-1}>
        <div className="drawer__head">
          <p className="eyebrow">{STAGE_NAMES[item.stage]} · {item.id}</p>
          <button type="button" className="icon-btn" aria-label="Close details" onClick={close}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        <label className="field field--title">
          <span>Title</span>
          <textarea rows={2} {...text('title')} onBlur={(e) => { if (!e.target.value.trim()) patch({ title: 'Untitled' }); }} />
        </label>

        {out && (
          <fieldset className="metrics">
            <legend>7-day read</legend>
            {METRICS.map((m) => (
              <label key={m.key} className={`field${m.key === 'impr' ? ' field--figure' : ''}`}>
                <span>{m.label}</span>
                <input
                  type="number" inputMode="numeric" min={0} placeholder="–"
                  value={item[m.key] ?? ''}
                  onFocus={checkpoint}
                  onChange={(e) => patch({ [m.key]: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                />
              </label>
            ))}
          </fieldset>
        )}

        <div className="fields">
          <label className="field">
            <span>Pillar</span>
            <select value={item.pillar} onFocus={checkpoint} onChange={(e) => patch({ pillar: e.target.value as Pillar })}>
              <option value="">None</option>
              {PILLAR_KEYS.map((p) => <option key={p} value={p}>{PILLARS[p]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select value={item.kind} onFocus={checkpoint} onChange={(e) => patch({ kind: e.target.value === 'hiring' ? 'hiring' : 'brand' })}>
              <option value="brand">Brand post</option>
              <option value="hiring">Hiring post</option>
            </select>
          </label>
          <label className="field">
            <span>Format</span>
            <select {...text('format')}>
              <option value="">Not set</option>
              {withCurrent(FORMATS, item.format).map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tier</span>
            <select {...text('tier')}>
              <option value="">Not set</option>
              {withCurrent(TIERS, item.tier).map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Visual card</span>
            <select {...text('card')}>
              <option value="">Not set</option>
              {withCurrent(CARD_STATES, item.card).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Reach</span>
            <input type="text" {...text('reach')} placeholder="own, or the account reshared" />
          </label>
          <label className="field">
            <span>{item.stage === 'Idea' ? 'Surfaced' : 'Drafted'}</span>
            <input type="date" {...text('created')} />
          </label>
          <label className="field">
            <span>Planned slot</span>
            <input type="date" {...text('slot')} />
          </label>
          {out && (
            <label className="field">
              <span>Published</span>
              <input type="date" {...text('published')} />
            </label>
          )}
        </div>

        <label className="field">
          <span>Note</span>
          <textarea rows={2} {...text('note')} placeholder="What is this waiting on?" />
        </label>

        <label className="field">
          <span>Draft <em>{words} {words === 1 ? 'word' : 'words'} · {item.body.length} characters</em></span>
          <textarea rows={8} className="draft" {...text('body')} placeholder="Paste or write the post here." />
        </label>

        <div className="drawer__actions">
          {next && <button type="button" className="btn btn--primary" onClick={() => moveItem(item.id, next)}>Move to {STAGE_NAMES[next]}</button>}
          {back && <button type="button" className="btn btn--ghost" onClick={() => moveItem(item.id, back)}>Move back to {STAGE_NAMES[back]}</button>}
          {canStale(item.stage) && <button type="button" className="btn btn--ghost" onClick={() => moveItem(item.id, 'Stale')}>Mark as stale</button>}
          <button type="button" className="btn btn--quiet" onClick={() => { remove(item.id); close(); say('Card deleted.', true); }}>Delete card</button>
        </div>
      </aside>
    </>
  );
}
