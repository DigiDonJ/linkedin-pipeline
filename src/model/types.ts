export type Stage = 'Idea' | 'Drafted' | 'Scheduled' | 'Published' | 'Measured' | 'Stale';
export type Pillar = '' | 'P1' | 'P2' | 'P3' | 'P4';
export type Kind = 'brand' | 'hiring';

export interface Item {
  id: string;
  title: string;
  stage: Stage;
  kind: Kind;
  pillar: Pillar;
  tier: string;
  format: string;
  /** "own", or the account a reshare borrowed reach from. */
  reach: string;
  /** ISO dates (YYYY-MM-DD) or ''. */
  created: string;
  published: string;
  slot: string;
  /** Visual card status: built, needs card, spec only, none by design. */
  card: string;
  note: string;
  /** Draft text of the post. */
  body: string;
  impr: number | null;
  /** Day the 7-day read was taken on. */
  day: number | null;
  react: number | null;
  comment: number | null;
  save: number | null;
}

export interface Filters {
  pillar: 'All' | Exclude<Pillar, ''>;
  hiring: boolean;
  stale: boolean;
  query: string;
}
