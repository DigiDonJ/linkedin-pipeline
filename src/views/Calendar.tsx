import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { useDragSensors, useNarrow, useToday } from '../hooks';
import { calendarDate, dayNum, fmtW, monthGrid, monthLabel, num, shiftMonth } from '../model/logic';
import { scheduleItem, useUi } from '../model/store';
import type { Item } from '../model/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const isOut = (it: Item) => it.stage === 'Published' || it.stage === 'Measured';
const isOverdue = (it: Item, today: string) => it.stage === 'Drafted' && !!it.slot && it.slot < today;

function chipState(it: Item, today: string) {
  if (isOut(it)) return { kind: 'out', sub: it.impr !== null ? `${num(it.impr)} impr` : 'Published' };
  if (isOverdue(it, today)) return { kind: 'over', sub: `${dayNum(today) - dayNum(it.slot)}d over` };
  if (it.stage === 'Scheduled') return { kind: 'sched', sub: 'Scheduled' };
  return { kind: 'slot', sub: it.slot ? 'Planned slot' : 'No slot' };
}

function Chip({ item, today, draggable, showSub }: { item: Item; today: string; draggable: boolean; showSub?: boolean }) {
  const set = useUi((s) => s.set);
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: item.id, disabled: !draggable });
  const st = chipState(item, today);
  return (
    <button ref={setNodeRef} type="button" className={`evt evt--${st.kind}`} data-dragging={isDragging || undefined} onClick={() => set({ sel: item.id })} {...listeners}>
      <span className="evt__title">{item.title}</span>
      {showSub && <span className="evt__sub">{item.pillar ? `${item.pillar} · ` : ''}{st.sub}</span>}
    </button>
  );
}

function Day({ date, inMonth, today, items }: { date: string; inMonth: boolean; today: string; items: Item[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return (
    <div ref={setNodeRef} className="day" data-date={date} data-out={!inMonth || undefined} data-today={date === today || undefined} data-over={isOver || undefined}>
      <span className="day__num">{Number(date.slice(8))}</span>
      {items.map((it) => <Chip key={it.id} item={it} today={today} draggable={!isOut(it)} />)}
    </div>
  );
}

function Tray({ items, today, draggable }: { items: Item[]; today: string; draggable: boolean }) {
  return (
    <aside className="tray" aria-label="Drafts to schedule">
      <h2>To schedule <span>{items.length}</span></h2>
      <p className="tray__hint">{draggable ? 'Drafts with no slot, or a slot that has passed. Drag one onto a day.' : 'Drafts with no slot, or a slot that has passed. Open one to set a date.'}</p>
      <div className="tray__list">
        {items.map((it) => <Chip key={it.id} item={it} today={today} draggable={draggable} showSub />)}
        {items.length === 0 && <p className="empty">Every draft has a date.</p>}
      </div>
    </aside>
  );
}

export default function Calendar({ items }: { items: Item[] }) {
  const today = useToday();
  const narrow = useNarrow();
  const sensors = useDragSensors();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dragId, setDragId] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      const d = calendarDate(it);
      if (d) m.set(d, [...(m.get(d) ?? []), it]);
    }
    return m;
  }, [items]);
  const tray = useMemo(
    () => items.filter((it) => it.stage === 'Drafted' && (!it.slot || it.slot < today)).sort((a, b) => (a.slot || '9').localeCompare(b.slot || '9') || a.created.localeCompare(b.created)),
    [items, today],
  );
  const dragging = dragId ? items.find((it) => it.id === dragId) : null;

  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const target = e.over ? String(e.over.id) : '';
    if (target.startsWith('day:')) scheduleItem(String(e.active.id), target.slice(4));
  };

  const agenda = days.filter((d) => d.startsWith(month) && byDate.has(d));

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      <div className="cal">
        <div className="cal__main">
          <div className="cal__bar">
            <h2>{monthLabel(month, true)}</h2>
            <div className="cal__nav">
              <button type="button" className="chip" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
              <button type="button" className="chip" onClick={() => setMonth(today.slice(0, 7))}>Today</button>
              <button type="button" className="chip" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
            </div>
            <ul className="legend" aria-label="Key">
              <li><i className="evt--sched" />Scheduled</li>
              <li><i className="evt--slot" />Planned slot</li>
              <li><i className="evt--over" />Overdue</li>
              <li><i className="evt--out" />Published</li>
            </ul>
          </div>
          {narrow ? (
            <div className="agenda">
              {agenda.map((d) => (
                <section key={d} data-today={d === today || undefined}>
                  <h3>{fmtW(d)}</h3>
                  {byDate.get(d)!.map((it) => <Chip key={it.id} item={it} today={today} draggable={false} showSub />)}
                </section>
              ))}
              {agenda.length === 0 && <p className="empty">Nothing planned or published this month.</p>}
            </div>
          ) : (
            <div className="grid" role="grid" aria-label={monthLabel(month, true)}>
              {WEEKDAYS.map((w) => <div key={w} className="grid__head">{w}</div>)}
              {days.map((d) => <Day key={d} date={d} inMonth={d.startsWith(month)} today={today} items={byDate.get(d) ?? []} />)}
            </div>
          )}
        </div>
        <Tray items={tray} today={today} draggable={!narrow} />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && <div className="evt evt--sched evt--ghost"><span className="evt__title">{dragging.title}</span></div>}
      </DragOverlay>
    </DndContext>
  );
}
