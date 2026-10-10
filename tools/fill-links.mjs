// Pogodi pjesmu: automatsko održavanje YouTube linkova.
// Pokreće ga GitHub Actions (.github/workflows/fill-links.yml). Ključ dolazi iz tajne YT_API_KEY.
//
// Koraci:
//  1. Učita popise iz data.js i dosad pronađene linkove iz links.json.
//  2. PROVJERA (jeftina, 1 jedinica kvote na 50 videa): za svaki poznati video provjeri je li
//     još javan, smije li se ugraditi u drugu stranicu i smije li se puštati u Hrvatskoj.
//  3. PRETRAGA (skupa, 100 jedinica po pjesmi): za pjesme bez ispravnog videa traži zamjenu.
//     Najviše MAX_SEARCH pretraga po pokretanju; ostatak ide idući put.
//  4. Zapiše links.json. Commit radi workflow.
//
// Lokalni test bez mreže: node tools/fill-links.mjs --dry  (samo ispiše što bi radio)

import fs from "node:fs";
import vm from "node:vm";

const KEY = process.env.YT_API_KEY;
const DRY = process.argv.includes("--dry");
const REGION = "HR";
const MAX_SEARCH = 90;                      // 90 × 100 = 9.000 od 10.000 besplatnih jedinica dnevno
const API = "https://www.googleapis.com/youtube/v3";

/* ---------- podaci ---------- */
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("data.js", "utf8") + ";this.LISTS=LISTS;this.keyOf=keyOf;", ctx);
const { LISTS, keyOf } = ctx;

const store = fs.existsSync("links.json") ? JSON.parse(fs.readFileSync("links.json", "utf8")) : {};
const links = store.links || {};            // "izvođač|naziv" -> {id, ch, v, auto:1}
const blocked = store.blocked || {};        // videoId -> razlog

const songs = new Map();                    // jedinstvene pjesme preko svih lista
for (const l of Object.values(LISTS)) for (const s of l.songs) if (!songs.has(keyOf(s))) songs.set(keyOf(s), s);

/* ---------- YouTube API ---------- */
let quota = 0;
async function yt(path, params, cost) {
  if (!KEY) throw new Error("Nema YT_API_KEY tajne.");
  const url = `${API}/${path}?` + new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(url);
  quota += cost;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason || res.status;
    const err = new Error(`YouTube API ${path}: ${reason}`); err.reason = String(reason); throw err;
  }
  return body;
}

// Vrati razlog zašto video ne valja, ili null ako je u redu.
function problem(item) {
  if (!item) return "obrisan";
  if (item.status?.privacyStatus !== "public") return "nije javan";
  if (item.status?.embeddable === false) return "ugradnja zabranjena";
  const rr = item.contentDetails?.regionRestriction;
  if (rr?.blocked?.includes(REGION) || (rr?.allowed && !rr.allowed.includes(REGION))) return "blokiran u Hrvatskoj";
  return null;
}

async function checkVideos(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const r = await yt("videos", { part: "status,contentDetails,snippet", id: batch.join(","), maxResults: 50 }, 1);
    const byId = Object.fromEntries((r.items || []).map(it => [it.id, it]));
    for (const id of batch) out[id] = { problem: problem(byId[id]), item: byId[id] };
  }
  return out;
}

/* ---------- izbor najboljeg rezultata (isto pravilo kao prije u igri) ---------- */
const norm = x => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/đ/g, "d").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const decode = x => (x || "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const BAD = /karaoke|cover|instrumental|\b8d\b|nightcore|sped up|slowed|reverb|tutorial|lesson|reaction|bass boost|1 hour|loop|guitar|drum|piano|backing track|parody|mashup/i;
const REMIX = /remix|\bmix\b/i;
const LIVE = /\blive\b|concert|uzivo|unplugged|\bmtv\b/i;

function score(song, title, ch) {
  const main = norm(song.a.split(/ ft\.| & | i | feat| vs /i)[0]).replace(/^the /, "");
  const words = norm(song.t.replace(/\(.*?\)/g, "")).split(" ").filter(w => w.length > 2);
  const nt = norm(title), nc = norm(ch);
  if (BAD.test(title)) return null;
  if (REMIX.test(title) && !REMIX.test(song.t)) return null;
  const hit = words.length ? words.filter(w => nt.includes(w)).length / words.length : 1;
  if (hit < 0.5) return null;
  let sc = hit * 3, v = "";
  if (/ - topic$/i.test(ch)) sc += 6;
  else if (/vevo/i.test(ch) || nc.includes(main)) sc += 4;
  else v = "neslužbeni kanal";
  if (/official/i.test(title)) sc += 2;
  if (/lyric/i.test(title)) { sc += 0.5; v = v || "lyrics video"; }
  if (nt.includes(main) || nc.includes(main)) sc += 2;
  if (LIVE.test(title)) { sc -= 6; v = "live"; }
  return { sc, v };
}

async function findReplacement(song) {
  const r = await yt("search", {
    part: "snippet", type: "video", videoEmbeddable: "true", regionCode: REGION,
    maxResults: 10, q: `${song.a} ${song.t}`
  }, 100);
  const cands = (r.items || [])
    .map(it => ({ id: it.id.videoId, title: decode(it.snippet.title), ch: decode(it.snippet.channelTitle) }))
    .filter(c => c.id && !blocked[c.id])
    .map(c => ({ ...c, ...score(song, c.title, c.ch) }))
    .filter(c => c.sc !== undefined)
    .sort((a, b) => b.sc - a.sc);
  if (!cands.length) return null;
  const checked = await checkVideos(cands.slice(0, 5).map(c => c.id));
  for (const c of cands.slice(0, 5)) {
    if (!checked[c.id].problem) return c;
    blocked[c.id] = checked[c.id].problem;
  }
  return null;
}

/* ---------- glavni tijek ---------- */
const current = s => { const l = links[keyOf(s)]; return (l && l.id) || s.id || null; };

const known = [...new Set([...songs.values()].flatMap(s => [s.id, links[keyOf(s)]?.id]).filter(Boolean))];
console.log(`Pjesama: ${songs.size}, poznatih videa: ${known.length}`);
if (DRY) {
  const missing = [...songs.values()].filter(s => !current(s));
  console.log(`Bez linka: ${missing.length}`); missing.forEach(s => console.log("  -", keyOf(s)));
  process.exit(0);
}

let changed = 0, searched = 0, found = 0;
const report = [];
try {
  // 2. provjera
  const status = await checkVideos(known);
  for (const [id, st] of Object.entries(status)) {
    if (st.problem && blocked[id] !== st.problem) { blocked[id] = st.problem; changed++; report.push(`blokiran ${id}: ${st.problem}`); }
    if (!st.problem && blocked[id]) { delete blocked[id]; changed++; }
  }
  // 3. pretraga zamjena
  const todo = [...songs.values()].filter(s => { const id = current(s); return !id || blocked[id]; });
  console.log(`Treba zamjenu: ${todo.length}`);
  for (const s of todo) {
    if (searched >= MAX_SEARCH) { report.push(`limit pretrage, ostalo ${todo.length - searched} za idući put`); break; }
    searched++;
    const best = await findReplacement(s);
    if (best) {
      links[keyOf(s)] = { id: best.id, ch: best.ch, ...(best.v ? { v: best.v } : {}), auto: 1 };
      found++; changed++; report.push(`+ ${keyOf(s)} -> ${best.id} (${best.ch}${best.v ? ", " + best.v : ""})`);
    } else report.push(`- ${keyOf(s)}: nema prikladnog videa`);
  }
} catch (e) {
  report.push(`PREKID: ${e.message}`);
  if (!/quota/i.test(e.reason || "")) { console.error(e.message); }
}

const out = { generated: new Date().toISOString(), links, blocked };
fs.writeFileSync("links.json", JSON.stringify(out, null, 1) + "\n");
console.log(report.join("\n"));
console.log(`\nPretraga: ${searched}, pronađeno: ${found}, promjena: ${changed}, potrošeno kvote: ~${quota}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Pogodi pjesmu: linkovi\n\nPretraga: ${searched}, pronađeno: ${found}, promjena: ${changed}, kvota ~${quota}\n\n\`\`\`\n${report.join("\n")}\n\`\`\`\n`);
}
