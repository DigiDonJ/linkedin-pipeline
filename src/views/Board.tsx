import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import CardFace from '../components/CardFace';
import { useDragSensors, useNarrow, useToday } from '../hooks';
import { SORTERS, STAGES, STAGE_NAMES, topId } from '../model/logic';
import { moveItem, usePipeline, useUi } from '../model/store';
import type { Item, Stage } from '../model/types';

function Card({ item, today, top, draggable }: { item: Item; today: string; top: string | null; draggable: boolean }) {
  const sel = useUi((s) => s.sel);
  const set = useUi((s) => s.set);
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: item.id, disabled: !draggable });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="card"
      data-selected={sel === item.id || undefined}
      data-dragging={isDragging || undefined}
      onClick={() => set({ sel: item.id })}
      {...listeners}
    >
      <CardFace item={item} today={today} top={top} />
    </button>
  );
}

function AddIdea() {
  const [draft, setDraft] = useState('');
  const pillar = useUi((s) => s.pillar);
  const add = usePipeline((s) => s.add);
  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    add(title, pillar === 'All' ? '' : pillar);
    setDraft('');
  };
  return (
    <form className="add" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input type="text" aria-label="New idea" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New idea" />
      <button type="submit" className="btn btn--primary">Add</button>
    </form>
  );
}

function Column({ stage, cards, today, top, draggable }: { stage: Stage; cards: Item[]; today: string; top: string | null; draggable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} className="col" aria-label={STAGE_NAMES[stage]} data-over={isOver || undefined}>
      <div className="col__head">
        <span className={`col__dot col__dot--${stage}`} aria-hidden="true" />
        <h2>{STAGE_NAMES[stage]}</h2>
        <span className="col__count">{cards.length}</span>
      </div>
      {stage === 'Idea' && <AddIdea />}
      <div className="col__body">
        {cards.map((it) => <Card key={it.id} item={it} today={today} top={top} draggable={draggable} />)}
        {cards.length === 0 && <p className="empty">{draggable ? 'Nothing here. Drag a card in.' : 'Nothing here.'}</p>}
      </div>
    </section>
  );
}

export default function Board({ items, all }: { items: Item[]; all: Item[] }) {
  const today = useToday();
  const narrow = useNarrow();
  const showStale = useUi((s) => s.stale);
  const sensors = useDragSensors();
  const [tab, setTab] = useState<Stage>('Drafted');
  const [dragId, setDragId] = useState<string | null>(null);

  const top = useMemo(() => topId(all), [all]);
  const stages: Stage[] = showStale ? [...STAGES, 'Stale'] : STAGES;
  const byStage = useMemo(() => {
    const m = {} as Record<Stage, Item[]>;
    for (const s of stages) m[s] = items.filter((it) => it.stage === s).sort(SORTERS[s]);
    return m;
  }, [items, showStale]);
  const active = stages.includes(tab) ? tab : 'Drafted';
  const dragging = dragId ? all.find((it) => it.id === dragId) : null;

  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    if (e.over) moveItem(String(e.active.id), e.over.id as Stage);
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      {narrow && (
        <div className="stagetabs" role="tablist" aria-label="Stage">
          {stages.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={active === s} onClick={() => setTab(s)}>
              {STAGE_NAMES[s]} <span>{byStage[s].length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="board">
        {stages.filter((s) => !narrow || s === active).map((s) => (
          <Column key={s} stage={s} cards={byStage[s]} today={today} top={top} draggable={!narrow} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && <div className="card card--ghost"><CardFace item={dragging} today={today} top={top} /></div>}
      </DragOverlay>
    </DndContext>
  );
}
