#!/usr/bin/env node
// instagram-autopost: publish a queue of feed photos, reels and stories through the official
// Instagram API (Instagram API with Instagram Login). No password, no scraping, no browser automation.
// Usage:
//   node publish.mjs                 publish every item that is due now (queue.json)
//   node publish.mjs --dry-run       show what would be published
//   node publish.mjs --one FEED|STORIES|REELS <url> ["caption"]
//   node publish.mjs --types FEED,STORIES   slot mode: the next approved item of each listed type (one per type)
// Env: IG_TOKEN (required), QUEUE (queue.json), STATE (state.json), TZ_OFFSET_MIN (e.g. -180),
//      MIN_GAP_MIN between runs (default 30), MAX_PER_DAY (default 8), MAX_PER_RUN (default 3; items in one run wait a few minutes apart),
//      MAX_FEED / MAX_REELS / MAX_STORIES per day (default 3 / 2 / 3), TOPIC_GAP_H (default 24)
// Before each post it reads your live profile: per-type daily caps are counted there, and an item is skipped
// when the same image was already published (content hash) or its caption is close to a recent post.
// Items with the same "topic" as something posted in the last TOPIC_GAP_H hours wait for a later run.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const API = "https://graph.instagram.com/v23.0";
const env = process.env;
const QUEUE = env.QUEUE || "queue.json";
const STATE = env.STATE || "state.json";
const MIN_GAP = Number(env.MIN_GAP_MIN || 30) * 60e3;
const MAX_PER_DAY = Number(env.MAX_PER_DAY || 8);
const MAX_PER_RUN = Number(env.MAX_PER_RUN || 3);
const OFFSET = Number(env.TZ_OFFSET_MIN || 0) * 60e3;
const CAP = { FEED: Number(env.MAX_FEED || 3), REELS: Number(env.MAX_REELS || 2), STORIES: Number(env.MAX_STORIES || 3) };
const TOPIC_GAP = Number(env.TOPIC_GAP_H || 24) * 3600e3;
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
// slot mode (fixed times of day): only these types, one item each, in queue order
const TYPES = args.includes("--types") ? args[args.indexOf("--types") + 1].toUpperCase().split(",") : null;
const token = env.IG_TOKEN;
if (!token && !dry) { console.error("Missing IG_TOKEN"); process.exit(1); }

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { published: {} };
state.skipped ||= {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const localNow = () => new Date(Date.now() + OFFSET);
const today = () => localNow().toISOString().slice(0, 10);

async function api(path, params = {}, method = "POST", base = API) {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries({ ...params, access_token: token })) if (v !== undefined) url.searchParams.set(k, v);
  const r = await fetch(url, { method });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${path}: ${JSON.stringify(j.error || j)}`);
  return j;
}

function dueItems() {
  if (args[0] === "--one") return [{ id: `one-${Date.now()}`, type: args[1], url: args[2], caption: args[3] }];
  const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
  const now = localNow().toISOString().slice(0, 16);
  const due = queue.filter((i) => i.approved !== false && !state.published[i.id] && !state.skipped[i.id] && (!i.at || i.at.slice(0, 16) <= now));
  return TYPES ? due.filter((i) => TYPES.includes(i.type)) : due;
}

// What is already on the profile: recent feed posts and reels, plus stories from the last 24 h
async function readProfile(userId) {
  const m = await api(`/${userId}/media`, { fields: "caption,media_product_type,timestamp", limit: 40 }, "GET");
  let s = { data: [] };
  try { s = await api(`/${userId}/stories`, { fields: "timestamp" }, "GET"); } catch {}
  return [...m.data.map((x) => ({ type: x.media_product_type === "REELS" ? "REELS" : "FEED", caption: x.caption || "", at: x.timestamp })),
    ...s.data.map((x) => ({ type: "STORIES", caption: "", at: x.timestamp }))];
}
const words = (t = "") => new Set(t.toLowerCase().replace(/#\S+|[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3));
function similar(a, b) {
  const A = words(a), B = words(b); if (!A.size || !B.size) return false;
  let c = 0; for (const w of A) if (B.has(w)) c++;
  return c / Math.min(A.size, B.size) >= 0.6;
}
async function hashOf(url) {
  const r = await fetch(url); if (!r.ok) throw new Error(`Media not reachable (${r.status}): ${url}`);
  return createHash("sha1").update(Buffer.from(await r.arrayBuffer())).digest("hex");
}
function repeated(item, hash, profile) {
  if (Object.values(state.published).some((p) => p.hash === hash)) return "same image already published";
  if (item.caption && profile.some((p) => similar(item.caption, p.caption))) return "caption too close to a recent post";
  return null;
}
const topicBusy = (item) => item.topic && Object.values(state.published).some((p) => p.topic === item.topic && Date.now() - Date.parse(p.at) < TOPIC_GAP);

function guard(firstOfRun) {
  const times = Object.values(state.published).map((p) => Date.parse(p.at)).sort((a, b) => b - a);
  const postedToday = Object.values(state.published).filter((p) => p.day === today()).length;
  if (postedToday >= MAX_PER_DAY) return `daily limit reached (${MAX_PER_DAY})`;
  if (firstOfRun && times[0] && Date.now() - times[0] < MIN_GAP) return `last post was less than ${MIN_GAP / 60e3} min ago`;
  return null;
}

async function publish(item, userId) {
  const p = { caption: item.type === "STORIES" ? undefined : item.caption };
  if (item.type === "REELS") Object.assign(p, { media_type: "REELS", video_url: item.url, share_to_feed: "true" });
  else if (item.type === "STORIES") Object.assign(p, { media_type: "STORIES", [/\.(mp4|mov)$/i.test(item.url) ? "video_url" : "image_url"]: item.url });
  else p.image_url = item.url;
  const c = await api(`/${userId}/media`, p);
  for (let i = 0; i < 60; i++) {
    const s = await api(`/${c.id}`, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") {
      // Instagram sometimes answers 9007 "media is not ready" right after FINISHED
      for (let j = 0; ; j++) {
        try { return await api(`/${userId}/media_publish`, { creation_id: c.id }); }
        catch (e) { if (j >= 5 || !String(e.message).includes("9007")) throw e; await sleep(10000); }
      }
    }
    if (s.status_code === "ERROR") throw new Error(`Instagram rejected ${item.url}`);
    await sleep(5000);
  }
  throw new Error(`Timed out processing ${item.url}`);
}

const items = dueItems();
if (!items.length) { console.log("Nothing due."); process.exit(0); }
if (dry) {
  const seen = new Set();
  for (const i of items) { if (TYPES && seen.has(i.type)) continue; seen.add(i.type); console.log(`[dry-run] ${i.type} ${i.url}`); }
  process.exit(0);
}
const me = await api("/me", { fields: "user_id,username" }, "GET");
const profile = await readProfile(me.user_id);
const day = (iso) => new Date(Date.parse(iso) + OFFSET).toISOString().slice(0, 10);
const todayCount = { FEED: 0, REELS: 0, STORIES: 0 };
for (const p of profile) if (day(p.at) === today()) todayCount[p.type]++;
let n = 0;
const doneTypes = new Set();
for (const item of items) {
  if (n >= MAX_PER_RUN) break;
  if (TYPES && doneTypes.has(item.type)) continue;
  if (todayCount[item.type] >= CAP[item.type]) { console.log(`Waiting: ${item.type} cap for today reached (${CAP[item.type]}).`); continue; }
  if (topicBusy(item)) { console.log(`Waiting: topic "${item.topic}" was posted in the last ${TOPIC_GAP / 3600e3} h.`); continue; }
  const hash = await hashOf(item.url), dup = repeated(item, hash, profile);
  if (dup) { console.log(`Skipped ${item.id}: ${dup}.`); state.skipped[item.id] = { why: dup, at: new Date().toISOString() }; writeFileSync(STATE, JSON.stringify(state, null, 1)); continue; }
  const why = guard(n === 0);
  if (why) { console.log(`Stopping: ${why}.`); break; }
  if (n++) await sleep(Math.min(MIN_GAP, 5 * 60e3));
  const res = await publish(item, me.user_id);
  todayCount[item.type]++;
  doneTypes.add(item.type);
  profile.push({ type: item.type, caption: item.caption || "", at: new Date().toISOString() });
  state.published[item.id] = { media: res.id, at: new Date().toISOString(), day: today(), hash, topic: item.topic };
  writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.log(`Published ${item.type} ${item.id} on @${me.username}: ${res.id}`);
}
try {
  const t = await api("/refresh_access_token", { grant_type: "ig_refresh_token" }, "GET", "https://graph.instagram.com");
  console.log(`Token refreshed: valid for ${Math.round(t.expires_in / 86400)} more days`);
} catch (e) { console.log("Warning: token not refreshed:", e.message); }
