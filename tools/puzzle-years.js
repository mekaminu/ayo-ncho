// Never the same puzzle twice (idea 9 Nov, night): deals every daily puzzle from WEEKLY_FROM to REROLLS_UNTIL, both games, in
// order, and where a day's puzzle sets the same pits as an earlier day's or misses the week's level, deals it again from the
// next seed until it is new and at its level (up to MAX_ROLLS; then the first new one). Writes the days that needed it into
// engine/puzzle.js between <rerolls> and </rerolls>.
//   node tools/puzzle-years.js          report and write the table
//   node tools/puzzle-years.js --check  report only; exit 1 if the table in engine/puzzle.js is not what the years give
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { weeklyPuzzle, weekLevel, WEEKLY_FROM, REROLLS_UNTIL, REROLLS } from "../engine/puzzle.js";

export const MAX_ROLLS = 40;
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function daysBetween(from, until) {
  const [y, m, d] = from.split("-").map(Number); const out = [];
  for (let i = 0; ; i++) { const k = keyOf(new Date(y, m - 1, d + i)); if (k > until) return out; out.push(k); }
}
export const sigOf = (p) => p.state.pits.join(",");

// { table: {ncho: {key: roll}, ayo: {...}}, report: {variant: {days, rerolled, offLevel, repeats}} }
export function dealYears(until = REROLLS_UNTIL, from = WEEKLY_FROM) {
  const table = {}, report = {};
  for (const variant of ["ncho", "ayo"]) {
    const seen = new Set(); const t = {}; let raw = 0, offRaw = 0, offLevel = 0, repeats = 0; const days = daysBetween(from, until);
    for (const key of days) {
      const want = weekLevel(key); let pick = null, firstNew = null;
      for (let roll = 0; roll <= MAX_ROLLS; roll++) {
        const p = weeklyPuzzle(key, variant, want, roll); if (!p) continue;
        if (roll === 0) { if (seen.has(sigOf(p))) raw++; if (p.level !== want) offRaw++; }
        if (seen.has(sigOf(p))) continue;
        if (firstNew === null) firstNew = { p, roll };
        if (p.level === want) { pick = { p, roll }; break; }
      }
      pick = pick || firstNew;
      if (!pick) { repeats++; continue; } // never seen in practice: the test fails on it
      if (pick.p.level !== want) offLevel++;
      seen.add(sigOf(pick.p)); if (pick.roll) t[key] = pick.roll;
    }
    table[variant] = t; report[variant] = { days: days.length, repeatsLeftAlone: raw, offLevelLeftAlone: offRaw, rerolled: Object.keys(t).length, offLevel, repeats };
  }
  return { table, report };
}

export function tableSource(table) {
  const body = ["ncho", "ayo"].map((v) => `  ${v}: {${Object.entries(table[v]).map(([k, r]) => `"${k}":${r}`).join(",")}},`).join("\n");
  return `export const REROLLS = {\n${body}\n};`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now(); const { table, report } = dealYears();
  console.log(`dealt ${WEEKLY_FROM} … ${REROLLS_UNTIL} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  for (const [v, r] of Object.entries(report)) console.log(v, JSON.stringify(r));
  const same = JSON.stringify(table) === JSON.stringify({ ncho: REROLLS.ncho || {}, ayo: REROLLS.ayo || {} });
  if (process.argv.includes("--check")) { console.log(same ? "the table matches" : "the table is out of date"); process.exit(same ? 0 : 1); }
  const file = new URL("../engine/puzzle.js", import.meta.url); const src = readFileSync(file, "utf8");
  const next = src.replace(/(\/\/ <rerolls>[^\n]*\n)[\s\S]*?(\n\/\/ <\/rerolls>)/, (_, a, b) => a + tableSource(table) + b);
  writeFileSync(file, next); console.log(same ? "table unchanged" : "table written to engine/puzzle.js");
}
