# Apex PL

**Premier League Insight Playground**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/RinaliDaffa/ApexPL)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

🔗 **[Live Demo → apex-pl.vercel.app](https://apex-pl.vercel.app/)**

- **Cards-first UI** — Every insight lives in a tappable card, not a spreadsheet
- **Live FPL data** — Real-time momentum scores from Fantasy Premier League endpoints
- **Premium motion** — Broadcast-quality transitions with purposeful animation

---

## What is Apex PL?

Apex PL is a curiosity-first insight playground for Premier League fans. Instead of drowning users in tables and raw stats, it surfaces the _interesting_ bits: who's on fire, which match has the biggest momentum mismatch, and which players are quietly outperforming their hype.

Built for fans who want insight in under 60 seconds—not analysts building spreadsheets. The design language draws from Premier League night broadcast energy: deep purples, neon accents, and information density that rewards exploration.

---

## Key Features

| Feature                     | Description                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Momentum Snapshot**       | All 20 teams ranked by momentum score. Tap for teaser insights, sparkline trends, and narrative chips.                        |
| **Player Intelligence Hub** | Sort players by Threat, Creativity, Value, or Form. Filter by position or team. Cards reveal Hype vs Reality scores.          |
| **Matchday Radar**          | Fixture cards with momentum contrast bars and narrative tags ("Trap Game", "Momentum Mismatch"). Tap for match focus.         |
| **Compare Tool**            | Select two players from any page. Radar chart comparison with key differences highlighted.                                    |
| **Degraded Mode**           | When FPL is slow or unavailable, cached data is served with a visible "Last updated" timestamp. No crashes, no blank screens. |

---

## Screens & Routes

| Route            | Purpose                 | Notes                                                      |
| ---------------- | ----------------------- | ---------------------------------------------------------- |
| `/`              | Momentum Snapshot       | Hero spotlight for #1 team, signal strip, ranked card grid |
| `/players`       | Player Intelligence Hub | Filterable/sortable player cards with TCVF bars            |
| `/players/[id]`  | Player Detail           | Full profile with Hype/Reality, highlights, compare action |
| `/matchday`      | Matchday Radar          | Current gameweek fixtures with momentum contrast           |
| `/matchday/[id]` | Match Focus             | Deep dive on a single fixture with "What to Watch" bullets |
| `/compare`       | Head-to-Head            | Radar chart + key differences for two selected players     |
| `/teams/[id]`    | Team Focus              | Team drivers, top players, form sparkline                  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                       │
│  useTeams() / usePlayers() / useFixtures() → SWR hooks     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js API Routes (/api/*)                │
│  /api/teams  /api/players  /api/fixtures  /api/compare     │
│  ─────────────────────────────────────────────────────────  │
│  • Proxy layer (no direct FPL calls from client)            │
│  • Request de-duplication                                   │
│  • Normalization + scoring pipeline                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cache Layer                            │
│  Upstash Redis (optional) ───┬─── In-Memory Fallback       │
│                              │                              │
│  TTL: 5min teams/players, 2min fixtures                    │
│  Stale-while-revalidate: serve cached, refresh background  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  FPL Public Endpoints                       │
│  /bootstrap-static  /fixtures  /element-summary/[id]       │
└─────────────────────────────────────────────────────────────┘
```

**Key principles:**

- **No client-side FPL calls** — All external requests go through `/api/*` routes
- **No N+1 patterns** — `element-summary` is only fetched for compare/detail, never on list pages
- **Graceful degradation** — Stale cache is served if FPL is slow; UI shows "Cached" badge

---

## Data Sources

All data comes from the **public Fantasy Premier League API endpoints**. These are unofficial, undocumented endpoints that FPL exposes for their own web app.

> ⚠️ **Rate limits apply.** This project implements aggressive caching to minimize upstream load and avoid throttling.

---

## Getting Started

### Requirements

- Node.js 20.x
- npm 9+

### Local Development

```bash
# Clone the repository
git clone https://github.com/RinaliDaffa/ApexPL.git
cd ApexPL

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file with the following:

```env
# Upstash Redis (optional — falls back to in-memory cache)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

| Variable                   | Required | Description                        |
| -------------------------- | -------- | ---------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | No       | Upstash Redis REST API URL         |
| `UPSTASH_REDIS_REST_TOKEN` | No       | Upstash Redis authentication token |

> ⚠️ **Vercel users:** Set env vars in the dashboard **without quotes** around values.

---

## Deploy to Vercel

1. **Import repository** — Go to [vercel.com/new](https://vercel.com/new) and import this repo
2. **Set environment variables** — Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (no quotes)
3. **Configure Node version** — In Project Settings → General, set Node.js Version to `20.x`
4. **Deploy** — Click Deploy and wait for build to complete

The app will be live at `your-project.vercel.app`.

---

## Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| Framework     | Next.js 14 (App Router) |
| Language      | TypeScript 5.3          |
| Styling       | Tailwind CSS 3.4        |
| Animation     | Framer Motion           |
| Data Fetching | TanStack Query + SWR    |
| Caching       | Upstash Redis           |
| Charts        | Recharts                |
| Validation    | Zod                     |

---

## Repository Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (proxy layer)
│   │   ├── teams/
│   │   ├── players/
│   │   ├── fixtures/
│   │   └── compare/
│   ├── players/
│   ├── matchday/
│   ├── compare/
│   └── teams/
├── components/
│   └── ui/                 # Reusable UI components
├── hooks/                  # React hooks (useTeams, usePlayers, etc.)
├── lib/
│   ├── server/             # Server-only modules
│   │   ├── fpl-client.ts   # FPL API client
│   │   ├── cache.ts        # Cache layer abstraction
│   │   ├── normalize.ts    # Data normalization
│   │   └── scoring.ts      # Momentum/Hype/Reality calculations
│   └── types.ts            # Shared TypeScript types
├── context/                # React context providers
docs/
├── BUILD_TROUBLESHOOTING.md
└── ...
```

---

## UX Principles

- **Cards > Tables** — Information is chunked into tappable, scannable cards
- **Insight > Numbers** — Headlines like "On Fire" beat raw "78.4 momentum score"
- **Click = Reward** — Every tap reveals deeper context, never dead-ends
- **Skeletons > Spinners** — Maintain layout during loading states
- **Keyboard accessible** — All interactive elements are focusable and operable

---

## Screenshots

> 📸 _Placeholder — add screenshots to `/public/screenshots/`_

| Snapshot                                      | Players                                     | Matchday                                      |
| --------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| ![Snapshot](/public/screenshots/snapshot.png) | ![Players](/public/screenshots/players.png) | ![Matchday](/public/screenshots/matchday.png) |

---

## Roadmap

- [ ] Enhanced player detail with historical form charts
- [ ] Improved narrative variety (more tag types, context-aware chips)
- [ ] Fixture prediction confidence indicators
- [ ] PWA support for mobile home screen

---

## Credits & Disclaimer

**Apex PL is a fan-made project.** It is not affiliated with, endorsed by, or connected to the Premier League, Fantasy Premier League, or any football club.

Data is sourced from publicly available FPL endpoints. All trademarks and team crests are property of their respective owners.

Built with ❤️ for the PL community.

---

## License

MIT
