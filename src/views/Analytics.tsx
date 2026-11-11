import { useMemo } from 'react';
import { PILLARS, fmt, groupBy, median, monthLabel, num, perMonth, type Group } from '../model/logic';
import { useUi } from '../model/store';
import type { Item } from '../model/types';

function Bars({ title, note, groups, label }: { title: string; note: string; groups: Group[]; label?: (key: string) => string }) {
  const max = Math.max(1, ...groups.map((g) => g.avg));
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p className="panel__note">{note}</p>
      {groups.length === 0 && <p className="empty">No measured posts yet.</p>}
      <dl className="bars">
        {groups.map((g) => (
          <div key={g.key} className="bars__row">
            <dt>{label ? label(g.key) : g.key}</dt>
            <dd>
              <span className="bars__track"><span className="bars__fill" style={{ width: `${Math.max(1, (g.avg / max) * 100)}%` }} /></span>
              <span className="bars__val">{num(g.avg)}</span>
              <span className="bars__n">{g.n} {g.n === 1 ? 'post' : 'posts'}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function Analytics({ items }: { items: Item[] }) {
  const set = useUi((s) => s.set);
  const hiringOn = useUi((s) => s.hiring);

  const a = useMemo(() => {
    const live = items.filter((it) => it.stage !== 'Stale');
    const read = live.filter((it) => it.impr !== null);
    const brand = read.filter((it) => it.kind === 'brand');
    const hiring = read.filter((it) => it.kind === 'hiring');
    const sum = (xs: Item[]) => xs.reduce((n, it) => n + it.impr!, 0);
    const reshare = brand.filter((it) => it.format === 'Reshare');
    const own = brand.filter((it) => it.format !== 'Reshare');
    return {
      brand, hiring,
      total: sum(brand),
      median: median(brand.map((it) => it.impr!)),
      top: [...brand].sort((x, y) => y.impr! - x.impr!).slice(0, 8),
      byPillar: groupBy(brand, (it) => it.pillar).sort((x, y) => x.key.localeCompare(y.key)),
      byFormat: groupBy(brand, (it) => it.format).sort((x, y) => y.avg - x.avg),
      split: [
        { key: 'Own posts', n: own.length, total: sum(own), avg: own.length ? Math.round(sum(own) / own.length) : 0 },
        { key: 'Reshares', n: reshare.length, total: sum(reshare), avg: reshare.length ? Math.round(sum(reshare) / reshare.length) : 0 },
        { key: 'Hiring posts', n: hiring.length, total: sum(hiring), avg: hiring.length ? Math.round(sum(hiring) / hiring.length) : 0 },
      ].filter((g) => g.n > 0),
      months: perMonth(live),
      unread: live.filter((it) => (it.stage === 'Published' || it.stage === 'Measured') && it.impr === null).length,
    };
  }, [items]);

  const maxMonth = Math.max(1, ...a.months.map((m) => m.brand + m.hiring));

  return (
    <div className="stats">
      <p className="stats__scope">
        Brand posts with a 7-day read, within the current filters. Averages are impressions per post.
        {!hiringOn && ' Switch on Hiring posts to compare them.'}
      </p>

      <div className="kpis">
        <div className="kpi"><span className="kpi__fig">{num(a.brand.length)}</span><span className="kpi__label">brand posts measured</span></div>
        <div className="kpi"><span className="kpi__fig">{num(a.total)}</span><span className="kpi__label">impressions in total</span></div>
        <div className="kpi"><span className="kpi__fig">{a.median === null ? '–' : num(a.median)}</span><span className="kpi__label">median impressions per post</span></div>
        <div className="kpi"><span className="kpi__fig">{num(a.unread)}</span><span className="kpi__label">published with no read logged</span></div>
      </div>

      <div className="stats__grid">
        <Bars title="By pillar" note="Average impressions per brand post." groups={a.byPillar} label={(k) => PILLARS[k] ?? k} />
        <Bars title="By format" note="Average impressions per brand post." groups={a.byFormat} />
        <Bars title="Own, reshared, hiring" note="Average impressions per post. Hiring shows when its filter is on." groups={a.split} />

        <section className="panel">
          <h2>Posts per month</h2>
          <p className="panel__note">Everything published, by month.{hiringOn ? ' Lighter segment is hiring.' : ''}</p>
          {a.months.length === 0 && <p className="empty">Nothing published yet.</p>}
          <ol className="cols">
            {a.months.map((m) => (
              <li key={m.month} title={`${monthLabel(m.month, true)}: ${m.brand} brand, ${m.hiring} hiring`}>
                <span className="cols__val">{m.brand + m.hiring}</span>
                <span className="cols__stack" style={{ height: `${((m.brand + m.hiring) / maxMonth) * 100}%` }}>
                  {m.hiring > 0 && <span className="cols__hiring" style={{ flex: m.hiring }} />}
                  {m.brand > 0 && <span className="cols__brand" style={{ flex: m.brand }} />}
                </span>
                <span className="cols__label">{monthLabel(m.month)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel panel--wide">
          <h2>Top brand posts</h2>
          <p className="panel__note">Ranked by impressions at the 7-day read.</p>
          {a.top.length === 0 && <p className="empty">No measured posts yet.</p>}
          <ol className="top-posts">
            {a.top.map((it, i) => (
              <li key={it.id}>
                <button type="button" onClick={() => set({ sel: it.id })}>
                  <span className="top-posts__rank">{i + 1}</span>
                  <span className="top-posts__title">{it.title}</span>
                  <span className="top-posts__meta">{[it.pillar, it.format, it.published && fmt(it.published)].filter(Boolean).join(' · ')}</span>
                  <span className={`top-posts__fig${i === 0 ? ' top-posts__fig--gold' : ''}`}>{num(it.impr!)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
