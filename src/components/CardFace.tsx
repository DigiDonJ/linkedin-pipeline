import { decorate } from '../model/logic';
import type { Item } from '../model/types';

/** The inside of a board card. Shared by the card itself and its drag preview. */
export default function CardFace({ item, today, top }: { item: Item; today: string; top: string | null }) {
  const d = decorate(item, today, top);
  return (
    <>
      <span className="card__title">{item.title}</span>
      <span className="card__meta">
        {item.pillar && <span className="pill">{item.pillar}</span>}
        <span className={`tag tag--${d.tone}`}>{d.tag}</span>
        {d.flag && <span className="tag tag--strong">{d.flag}</span>}
        <span className="card__when">{d.when}</span>
      </span>
    </>
  );
}
