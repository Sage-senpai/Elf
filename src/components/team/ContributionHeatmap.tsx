import { cn } from "@/lib/cn";

/**
 * 12-week contribution heatmap. GitHub-style — 7 rows (days of the week),
 * 12 columns (weeks). Each cell is colored by intensity bucket.
 *
 * Pure server component. Takes a date->count map and renders SVG-like
 * squares as divs so it renders inside any list row without breaking
 * layout. No interactivity needed for the team page.
 */

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

export function ContributionHeatmap({
  dailyCounts,
  className
}: {
  dailyCounts: Record<string, number>;
  className?: string;
}) {
  // Build the 12-week × 7-day grid ending today. We back-compute each cell's
  // date so missing days naturally render as the empty bucket.
  const cells: { date: string; count: number }[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute the start so that the rightmost column ends on today.
  const totalDays = WEEKS * DAYS_PER_WEEK;
  for (let week = 0; week < WEEKS; week++) {
    const col: { date: string; count: number }[] = [];
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
      const offset = totalDays - 1 - (week * DAYS_PER_WEEK + day);
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = d.toISOString().slice(0, 10);
      col.push({ date: key, count: dailyCounts[key] ?? 0 });
    }
    cells.push(col);
  }

  // Bucket thresholds — same vibe as GitHub: 0, 1, 2-3, 4-6, 7+.
  function bucket(n: number): 0 | 1 | 2 | 3 | 4 {
    if (n === 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    if (n <= 6) return 3;
    return 4;
  }
  const tone: Record<number, string> = {
    0: "bg-elf-border/30",
    1: "bg-elf-mint/50",
    2: "bg-elf-mint",
    3: "bg-elf-deep/70",
    4: "bg-elf-forest"
  };

  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden="true">
      {cells.map((col, wIdx) => (
        <div key={wIdx} className="flex flex-col gap-[3px]">
          {col.map((c) => (
            <div
              key={c.date}
              title={`${c.date}: ${c.count} contribution${c.count === 1 ? "" : "s"}`}
              className={cn("w-[9px] h-[9px] rounded-[2px]", tone[bucket(c.count)])}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
