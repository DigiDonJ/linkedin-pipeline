# LinkedIn Pipeline

A board for running a LinkedIn content pipeline: ideas, drafts, scheduled posts, published posts and their 7-day results.

- **Board.** Five stages plus an optional Stale column. Drag cards between stages, filter by pillar, search titles, notes and draft text.
- **Card editor.** Title, pillar, format, tier, slot date, visual card status, note, the draft itself with a word count, and the 7-day read.
- **Calendar.** Planned slots and published posts by month. Drag a draft onto a day to schedule it. Overdue drafts are flagged.
- **Analytics.** Average impressions by pillar and format, own posts against reshares and hiring posts, posts per month, top posts.
- **Phone layout.** One stage at a time, installable to the home screen, works offline.

## Your data

Everything is stored in your browser on your device. Nothing is sent anywhere, and there is no account.

The app opens with example data. Use **Data** to import your own (JSON or CSV), export a backup, or start empty. To move between devices, export on one and import on the other.

An import file is either this app's JSON export or a CSV with at least `id` and `title` columns. Other columns: `stage` (Idea, Drafted, Scheduled, Published, Measured, Stale), `kind` (brand, hiring), `pillar` (P1 to P4), `tier`, `format`, `reach`, `created`, `published`, `slot` (dates as YYYY-MM-DD), `card`, `note`, `body`, `impr`, `day`, `react`, `comment`, `save`.

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build && npm run preview
```

```bash
node e2e/smoke.cjs http://localhost:4173/
```

`npm test` runs the unit tests for filtering, sorting, card labels, the calendar and import/export. The smoke script drives a real browser through the whole flow and needs Playwright with Chromium.

Pushing to `main` runs the tests, builds, and deploys to GitHub Pages (Settings, Pages, Source: GitHub Actions).

Built with Vite, React, TypeScript, zustand and dnd-kit.
