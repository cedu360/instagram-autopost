#!/usr/bin/env node
// instagram-autopost: publish a queue of feed photos, reels and stories through the official
// Instagram API (Instagram API with Instagram Login). No password, no scraping, no browser automation.
// Usage:
//   node publish.mjs                 publish every item that is due now (queue.json)
//   node publish.mjs --dry-run       show what would be published
//   node publish.mjs --one FEED|STORIES|REELS <url> ["caption"]
// Env: IG_TOKEN (required), QUEUE (queue.json), STATE (state.json), TZ_OFFSET_MIN (e.g. -180),
//      MIN_GAP_MIN between runs (default 30), MAX_PER_DAY (default 8), MAX_PER_RUN (default 3; items in one run wait a few minutes apart)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const API = "https://graph.instagram.com/v23.0";
const env = process.env;
const QUEUE = env.QUEUE || "queue.json";
const STATE = env.STATE || "state.json";
const MIN_GAP = Number(env.MIN_GAP_MIN || 30) * 60e3;
const MAX_PER_DAY = Number(env.MAX_PER_DAY || 8);
const MAX_PER_RUN = Number(env.MAX_PER_RUN || 3);
const OFFSET = Number(env.TZ_OFFSET_MIN || 0) * 60e3;
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const token = env.IG_TOKEN;
if (!token && !dry) { console.error("Missing IG_TOKEN"); process.exit(1); }

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { published: {} };
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
  return queue.filter((i) => !state.published[i.id] && (!i.at || i.at.slice(0, 16) <= now));
}

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

const items = dueItems().slice(0, MAX_PER_RUN);
if (!items.length) { console.log("Nothing due."); process.exit(0); }
if (dry) { for (const i of items) console.log(`[dry-run] ${i.type} ${i.url}`); process.exit(0); }
const me = await api("/me", { fields: "user_id,username" }, "GET");
for (const [n, item] of items.entries()) {
  const why = guard(n === 0);
  if (why) { console.log(`Stopping: ${why}.`); break; }
  if (n) await sleep(Math.min(MIN_GAP, 5 * 60e3));
  const res = await publish(item, me.user_id);
  state.published[item.id] = { media: res.id, at: new Date().toISOString(), day: today() };
  writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.log(`Published ${item.type} ${item.id} on @${me.username}: ${res.id}`);
}
try {
  const t = await api("/refresh_access_token", { grant_type: "ig_refresh_token" }, "GET", "https://graph.instagram.com");
  console.log(`Token refreshed: valid for ${Math.round(t.expires_in / 86400)} more days`);
} catch (e) { console.log("Warning: token not refreshed:", e.message); }
