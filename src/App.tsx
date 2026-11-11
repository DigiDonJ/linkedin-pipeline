import { useEffect, useMemo } from 'react';
import CardDrawer from './components/CardDrawer';
import DataMenu from './components/DataMenu';
import { PILLAR_KEYS, PILLARS, num, visible, waitingCount } from './model/logic';
import { usePipeline, useUi, type View } from './model/store';
import Analytics from './views/Analytics';
import Board from './views/Board';
import Calendar from './views/Calendar';

const VIEWS: { id: View; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' },
];

export default function App() {
  const items = usePipeline((s) => s.items);
  const isDemo = usePipeline((s) => s.isDemo);
  const undo = usePipeline((s) => s.undo);
  const ui = useUi();
  const shown = useMemo(() => visible(items, ui), [items, ui.pillar, ui.hiring, ui.stale, ui.query]);
  const selected = items.find((it) => it.id === ui.sel) ?? null;

  useEffect(() => {
    if (!ui.toast) return;
    const t = setTimeout(ui.dismiss, 6000);
    return () => clearTimeout(t);
  }, [ui.toast?.id]);

  return (
    <div className="app">
      <header className="top">
        <div className="top__row">
          <div className="top__title">
            <h1>LinkedIn Pipeline<span className="dot">.</span></h1>
            <p>
              <b>{num(shown.length)}</b> items in view · <b>{num(waitingCount(items))}</b> finished drafts waiting
            </p>
          </div>
          <nav className="views" aria-label="Views">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className="views__tab" aria-current={ui.view === v.id ? 'page' : undefined} onClick={() => ui.set({ view: v.id })}>
                {v.label}
              </button>
            ))}
          </nav>
          <DataMenu />
        </div>
        <div className="filters">
          <label className="search">
            <span>Search</span>
            <input type="search" value={ui.query} onChange={(e) => ui.set({ query: e.target.value })} placeholder="Title, note or draft" />
          </label>
          <div className="chips" role="group" aria-label="Filter by pillar">
            <button type="button" className="chip chip--fill" aria-pressed={ui.pillar === 'All'} onClick={() => ui.set({ pillar: 'All' })}>All pillars</button>
            {PILLAR_KEYS.map((p) => (
              <button key={p} type="button" className="chip chip--fill" aria-pressed={ui.pillar === p} title={PILLARS[p]} onClick={() => ui.set({ pillar: p })}>{p}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Show">
            <button type="button" className="chip" aria-pressed={ui.hiring} onClick={() => ui.set({ hiring: !ui.hiring })}>Hiring posts</button>
            <button type="button" className="chip" aria-pressed={ui.stale} onClick={() => ui.set({ stale: !ui.stale })}>Stale</button>
          </div>
        </div>
      </header>

      {isDemo && (
        <p className="banner">
          You are looking at example data. Open <b>Data</b> to import your own pipeline or start empty.
        </p>
      )}

      <main className="main">
        {ui.view === 'board' && <Board items={shown} all={items} />}
        {ui.view === 'calendar' && <Calendar items={shown} />}
        {ui.view === 'analytics' && <Analytics items={shown} />}
      </main>

      {selected && <CardDrawer key={selected.id} item={selected} />}

      {ui.toast && (
        <div className="toast" role="status">
          <span>{ui.toast.msg}</span>
          {ui.toast.undo && (
            <button type="button" onClick={() => { undo(); ui.dismiss(); }}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}
