import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBootstrap, fetchFixtures } from "@/lib/server/fpl-client";
import { normalizeTeams, normalizePlayers, normalizeFixtures } from "@/lib/server/normalize";
import type { PlayerNormalized, TeamNormalized } from "@/lib/types";
import { resolveFixtureNarrative, getTagStyles } from "@/lib/fixtureNarrative";
import { MatchDetailClient } from "./client";
import { TeamCrest } from "@/components/ui";

// Derive "What to Watch" bullets (pre-match) — max 3, specific but not predictive
function deriveWhatToWatch(homeMomentum: number, awayMomentum: number): string[] {
  const diff = homeMomentum - awayMomentum;
  const absd = Math.abs(diff);
  const bullets: string[] = [];

  // Gap analysis
  if (absd >= 20) {
    bullets.push("Significant momentum gap");
    bullets.push(diff > 0 ? "Home side on strong run" : "Away side in better form");
    bullets.push("Form difference may prove decisive");
  } else if (absd < 10) {
    bullets.push("Tight momentum margins");
    bullets.push("Both sides evenly matched on form");
  } else {
    bullets.push("Moderate momentum difference");
    bullets.push(diff > 0 ? "Home edge on current form" : "Away surge in recent weeks");
  }

  return bullets.slice(0, 3);
}

// Derive "What Decided It" bullets (post-match) — past tense, shortName grounded
function deriveWhatDecidedIt(
  homeMomentum: number,
  awayMomentum: number,
  homeShort: string,
  awayShort: string
): string[] {
  const diff = homeMomentum - awayMomentum;
  const absd = Math.abs(diff);
  const bullets: string[] = [];

  // Momentum gap analysis with shortName — no score (shown separately)
  if (absd >= 20) {
    const leader = diff > 0 ? homeShort : awayShort;
    bullets.push(`${leader} carried a big momentum edge (+${absd})`);
  } else if (absd < 10) {
    bullets.push("Fine margins throughout—form nearly level");
  } else {
    bullets.push("Moderate form gap showed on the day");
  }

  // Edge analysis with context
  if (homeMomentum > awayMomentum) {
    bullets.push("Home edge held across the last-5 form window");
  } else if (awayMomentum > homeMomentum) {
    bullets.push(`${awayShort} momentum carried through away`);
  }

  return bullets.slice(0, 2);
}

// Format kickoff time
function formatKickoff(isoTime: string): string {
  if (!isoTime) return "TBD";
  const date = new Date(isoTime);
  const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${dayFormatter.format(date)} · ${timeFormatter.format(date)} UTC`;
}

// Get players on fire for a team
function getPlayersOnFire(
  allPlayers: PlayerNormalized[],
  teamId: number,
  count: number = 3
): PlayerNormalized[] {
  return allPlayers
    .filter((p) => p.teamId === teamId)
    .sort((a, b) => b.features.form - a.features.form)
    .slice(0, count);
}

// Note: TAG_STYLES removed - now using getTagStyles from fixtureNarrative.ts

// Delta copy — shortName grounded, cleaner broadcast style
function getDeltaCopy(
  homeMomentum: number,
  awayMomentum: number,
  homeShort: string,
  awayShort: string
): string {
  const diff = homeMomentum - awayMomentum;
  const absd = Math.abs(diff);
  
  if (absd === 0) {
    return "Level momentum";
  }
  
  const leader = diff > 0 ? homeShort : awayShort;
  
  if (absd >= 20) {
    return `${leader} +${absd} (large gap)`;
  } else if (absd >= 10) {
    return `${leader} +${absd} (medium)`;
  } else {
    return `${leader} +${absd}`;
  }
}

// Derive player micro-insight with strict variety (max 1 consecutive repeat)
function derivePlayerInsights(players: PlayerNormalized[]): Map<number, string> {
  const result = new Map<number, string>();
  let lastInsight = "";

  // Priority order for features
  const getTopFeature = (p: PlayerNormalized): { key: string; value: number } => {
    const features = [
      { key: "form", value: p.features.form },
      { key: "threat", value: p.features.threat },
      { key: "creativity", value: p.features.creativity },
      { key: "value", value: p.features.value },
    ];
    return features.sort((a, b) => b.value - a.value)[0];
  };

  const insightMap: Record<string, string[]> = {
    form: ["Hot form", "Strong recent form", "Form is peaking"],
    threat: ["High goal threat", "Dangerous in front of goal", "Attacking threat"],
    creativity: ["Creative spark", "Chance creator", "Playmaking ability"],
    value: ["Great value", "Strong value pick", "Efficient returns"],
  };

  for (const player of players) {
    const top = getTopFeature(player);
    const options = insightMap[top.key] || ["Key contributor"];
    
    // Pick an option that's different from last (variety)
    let insight = options[0];
    for (const opt of options) {
      if (opt !== lastInsight) {
        insight = opt;
        break;
      }
    }
    
    result.set(player.id, insight);
    lastInsight = insight;
  }

  return result;
}

// Derive reason line for narrative tag
function deriveNarrativeReason(homeMomentum: number, awayMomentum: number, tag: string): string | null {
  const absd = Math.abs(homeMomentum - awayMomentum);
  
  if (tag === "Closer Than It Looks" && absd < 10) {
    return "Reason: momentum scores within 10 points";
  }
  if (tag === "Momentum Mismatch" && absd >= 20) {
    return "Reason: momentum gap exceeds 20 points";
  }
  if (tag === "Trap Game") {
    return "Reason: away side favored but home advantage applies";
  }
  
  return null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchFocusPage({ params }: PageProps) {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);

  if (isNaN(fixtureId)) {
    notFound();
  }

  // Fetch all required data using cached server modules
  const [bootstrapResult, fixturesResult] = await Promise.all([
    fetchBootstrap(),
    fetchFixtures(),
  ]);

  // Normalize data
  const teams = normalizeTeams(bootstrapResult.data, fixturesResult.data);
  const players = normalizePlayers(bootstrapResult.data);
  const allFixtures = normalizeFixtures(fixturesResult.data, teams, false);

  // Find the specific fixture
  const fixture = allFixtures.find((f) => f.id === fixtureId);

  if (!fixture) {
    notFound();
  }

  // Get team data
  const teamMap = new Map<number, TeamNormalized>(teams.map((t) => [t.id, t]));
  const homeTeamData = teamMap.get(fixture.homeTeam.id);
  const awayTeamData = teamMap.get(fixture.awayTeam.id);

  // Get players on fire for each team
  const homePlayersOnFire = getPlayersOnFire(players, fixture.homeTeam.id);
  const awayPlayersOnFire = getPlayersOnFire(players, fixture.awayTeam.id);

  // Derive insights with variety per column
  const homeInsightMap = derivePlayerInsights(homePlayersOnFire);
  const awayInsightMap = derivePlayerInsights(awayPlayersOnFire);

  // Derive bullets based on match status
  const isFinished = fixture.finished;
  const homeMomentum = fixture.momentumContrast.homeScore ?? 0;
  const awayMomentum = fixture.momentumContrast.awayScore ?? 0;

  const bullets = isFinished
    ? deriveWhatDecidedIt(homeMomentum, awayMomentum, fixture.homeTeam.shortName, fixture.awayTeam.shortName)
    : deriveWhatToWatch(homeMomentum, awayMomentum);

  const bulletSectionTitle = isFinished ? "What Decided It" : "What to Watch";

  const formattedKickoff = formatKickoff(fixture.kickoffTime);
  const status = fixture.finished ? "Finished" : fixture.started ? "Live" : "Upcoming";

  // Use canonical narrative resolver for consistency with list page
  const narrative = resolveFixtureNarrative(fixture);
  const displayTag = narrative.primary;
  const tagStyle = getTagStyles(narrative.primary);
  
  // Derive reason line for upcoming matches
  const narrativeReason = !isFinished 
    ? deriveNarrativeReason(homeMomentum, awayMomentum, displayTag)
    : null;

  // Delta copy
  const deltaCopy = getDeltaCopy(homeMomentum, awayMomentum, fixture.homeTeam.shortName, fixture.awayTeam.shortName);

  // Prepare player data with insights
  const homePlayersWithInsights = homePlayersOnFire.map((p) => ({
    ...p,
    insight: homeInsightMap.get(p.id) || "Key contributor",
  }));
  const awayPlayersWithInsights = awayPlayersOnFire.map((p) => ({
    ...p,
    insight: awayInsightMap.get(p.id) || "Key contributor",
  }));

  // Format last updated
  const lastUpdated = fixturesResult.lastUpdated;

  return (
    <main className="container-apex py-6 md:py-10 max-w-4xl pb-28">
      {/* Back Link */}
      <Link
        href="/matchday"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong transition-colors mb-4 group"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform group-hover:-translate-x-1"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Matchday
      </Link>

      {/* Header Card */}
      <section className="card p-5 md:p-6 mb-4">
        {/* Top row: Matchup with Crests + LastUpdated */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-4">
            {/* Home Team */}
            <div className="flex items-center gap-2">
              <TeamCrest teamCode={fixture.homeTeam.code} shortName={fixture.homeTeam.shortName} size={40} />
              <span className="text-2xl md:text-3xl font-bold text-text-strong">{fixture.homeTeam.shortName}</span>
            </div>
            
            <span className="text-text-muted text-xl">vs</span>
            
            {/* Away Team */}
            <div className="flex items-center gap-2">
              <TeamCrest teamCode={fixture.awayTeam.code} shortName={fixture.awayTeam.shortName} size={40} />
              <span className="text-2xl md:text-3xl font-bold text-text-strong">{fixture.awayTeam.shortName}</span>
            </div>
          </div>
          
          {/* LastUpdated */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse" aria-hidden="true" />
            <span className="font-mono">
              Updated {new Date(lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
            </span>
          </div>
        </div>

        {/* Kickoff */}
        <p className="text-sm text-text-muted font-mono mb-3">{formattedKickoff}</p>

        {/* Status + Narrative pills */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`
              px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide
              ${fixture.finished ? "bg-text-faint/20 text-text-muted" : fixture.started ? "bg-status-hot/20 text-status-hot" : "bg-accent-mint/10 text-accent-mint"}
            `}
          >
            {status}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-current/10 ${tagStyle.bg} ${tagStyle.text} ${tagStyle.glow}`}
          >
            {displayTag}
          </span>
          
          {/* Show pre-match tag as secondary for finished matches */}
          {isFinished && (
            <span className="text-[10px] text-text-faint ml-1">
              Pre-match: {fixture.narrativeTag}
            </span>
          )}
        </div>
        
        {/* Narrative reason line for upcoming */}
        {narrativeReason && (
          <p className="text-[10px] text-text-faint mb-4 pl-0.5">{narrativeReason}</p>
        )}

        {/* Momentum Bars */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-accent-mint font-medium">Home</span>
            <span className="text-highlight-pink font-medium">Away</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Home bar */}
            <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-mint/40 to-accent-mint/80"
                style={{ width: `${homeMomentum}%` }}
              />
            </div>
            <div className="w-px h-6 bg-white/10" aria-hidden="true" />
            {/* Away bar */}
            <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-highlight-pink/80 to-highlight-pink/40"
                style={{ width: `${awayMomentum}%` }}
              />
            </div>
          </div>
          
          {/* Scores + Delta */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-mono font-semibold text-accent-mint">{homeMomentum}</span>
            
            {/* Delta copy - shortName grounded */}
            <span className="text-xs font-mono text-text-muted">{deltaCopy}</span>
            
            <span className="text-sm font-mono font-semibold text-highlight-pink">{awayMomentum}</span>
          </div>
        </div>
      </section>

      {/* Recent Context */}
      <section className="card p-5 mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">Recent Context</h2>

        {/* Final score if finished */}
        {fixture.finished && fixture.homeScore !== undefined && fixture.awayScore !== undefined && (
          <div className="mb-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
            <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Final Score</span>
            <span className="text-2xl font-bold text-text-strong font-mono">
              {fixture.homeScore} - {fixture.awayScore}
            </span>
          </div>
        )}

        {/* Form points caption + legend */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-text-muted">Form points — last 5</span>
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="text-text-faint mr-1">Legend:</span>
            <span className="flex items-center gap-1.5" title="Win = 3 points">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent-mint" aria-hidden="true" /> W=3
            </span>
            <span className="flex items-center gap-1.5" title="Draw = 1 point">
              <span className="w-2.5 h-2.5 rounded-sm bg-status-unstable" aria-hidden="true" /> D=1
            </span>
            <span className="flex items-center gap-1.5" title="Loss = 0 points">
              <span className="w-2.5 h-2.5 rounded-sm bg-status-hot/50" aria-hidden="true" /> L=0
            </span>
          </div>
        </div>

        {/* Last 5 sparklines */}
        <div className="grid grid-cols-2 gap-3">
          {/* Home team form */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-mint" aria-hidden="true" />
              <span className="text-xs text-text-muted font-medium">{fixture.homeTeam.shortName}</span>
            </div>
            {homeTeamData?.spark?.lastN && homeTeamData.spark.lastN.length > 0 ? (
              <div className="flex items-end gap-1 h-6" role="list" aria-label={`${fixture.homeTeam.shortName} last 5 results`}>
                {homeTeamData.spark.lastN.map((pts, i) => {
                  const matchNum = homeTeamData.spark.lastN.length - i;
                  const result = pts === 3 ? "Win" : pts === 1 ? "Draw" : "Loss";
                  return (
                    <div
                      key={i}
                      role="listitem"
                      className={`flex-1 rounded-sm cursor-help transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent-mint/50 ${pts === 3 ? "bg-accent-mint" : pts === 1 ? "bg-status-unstable" : "bg-status-hot/50"}`}
                      style={{ height: `${Math.max((pts / 3) * 100, 15)}%` }}
                      title={`Match -${matchNum}: ${result} (${pts} pts)`}
                      tabIndex={0}
                      aria-label={`Match minus ${matchNum}: ${result}, ${pts} points`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-faint">Trend data unavailable</p>
            )}
          </div>

          {/* Away team form */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-highlight-pink" aria-hidden="true" />
              <span className="text-xs text-text-muted font-medium">{fixture.awayTeam.shortName}</span>
            </div>
            {awayTeamData?.spark?.lastN && awayTeamData.spark.lastN.length > 0 ? (
              <div className="flex items-end gap-1 h-6" role="list" aria-label={`${fixture.awayTeam.shortName} last 5 results`}>
                {awayTeamData.spark.lastN.map((pts, i) => {
                  const matchNum = awayTeamData.spark.lastN.length - i;
                  const result = pts === 3 ? "Win" : pts === 1 ? "Draw" : "Loss";
                  return (
                    <div
                      key={i}
                      role="listitem"
                      className={`flex-1 rounded-sm cursor-help transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-highlight-pink/50 ${pts === 3 ? "bg-accent-mint" : pts === 1 ? "bg-status-unstable" : "bg-status-hot/50"}`}
                      style={{ height: `${Math.max((pts / 3) * 100, 15)}%` }}
                      title={`Match -${matchNum}: ${result} (${pts} pts)`}
                      tabIndex={0}
                      aria-label={`Match minus ${matchNum}: ${result}, ${pts} points`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-faint">Trend data unavailable</p>
            )}
          </div>
        </div>
      </section>

      {/* Players on Fire + What to Watch/Decided It - Client component */}
      <MatchDetailClient
        homeTeamName={fixture.homeTeam.shortName}
        awayTeamName={fixture.awayTeam.shortName}
        homePlayers={homePlayersWithInsights}
        awayPlayers={awayPlayersWithInsights}
        bullets={bullets}
        bulletSectionTitle={bulletSectionTitle}
      />
    </main>
  );
}
