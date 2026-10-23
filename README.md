# instagram-autopost

Schedule Instagram **feed posts, Reels and Stories** from a simple JSON queue, published through the **official Instagram API**. No password, no scraping, no browser automation: nothing that gets your account flagged.

*[Leia em português](README.pt-BR.md)*

- One file, zero dependencies (Node 20+).
- Runs anywhere: GitHub Actions (workflow included), cron, or by hand.
- Anti-ban limits built in: minimum gap between runs, daily cap, a few minutes between items, and never the same item twice.
- Refreshes the long-lived token on every run, so it does not expire while you post.

## The path, from zero to post

```
1. CREATE the content   →   2. ADD it to the queue     →   3. THE ROBOT POSTS
   Canva / Gemini (photos)     media/ folder + queue.json      5 slots a day
   Runway (reels)              here on GitHub                  on your Instagram
```

The full beginner walkthrough (with screenshots-level steps) is in the [Portuguese README](README.pt-BR.md); an AI can run the robot for you with [`skill/SKILL.md`](skill/SKILL.md).

## How it works

1. Host your images and videos at public HTTPS URLs (GitHub Pages works great).
2. List them in `queue.json` with a date and time (see `examples/queue.json`).
3. The included workflow runs at fixed slots (Brasília time: 09:37 photo + story, 11:47 reel, 14:07 photo + story, 16:47 reel, 19:37 photo + story). Each slot runs `node publish.mjs --types FEED,STORIES` or `--types REELS` and takes the next item of each type. Items without `at` go out in queue order; `"approved": false` holds an item. You can also run `node publish.mjs` hourly instead: whatever is due gets published.

```json
[
  { "id": "day1-feed", "at": "2026-11-01T09:30", "type": "FEED", "url": "https://you.github.io/media/post-01.jpg", "caption": "Hello!\n\n#brand" },
  { "id": "day1-story", "at": "2026-11-01T09:45", "type": "STORIES", "url": "https://you.github.io/media/story-01.jpg" },
  { "id": "day1-reel", "at": "2026-11-01T13:00", "type": "REELS", "url": "https://you.github.io/media/reel-01.mp4", "caption": "Watch this" }
]
```

`at` is local time (set `TZ_OFFSET_MIN`, e.g. `-180` for Brasília). Published items are recorded in `state.json`.

**It checks your profile first.** Before each post the robot reads your recent posts, reels and live stories. It skips an item whose image was already published (content hash) or whose caption is too close to a recent post, keeps each type under its daily cap, and holds back an item whose optional `topic` was posted in the last 24 h. Example rhythm: 3 stories (morning, afternoon, night) and 2 reels in between.

## Setup (10 minutes)

1. Switch your Instagram account to **Professional** (Business or Creator).
2. At developers.facebook.com: create an app, add the use case *Manage messages and content on Instagram*, then in *API setup with Instagram login*: add the permission `instagram_business_content_publish`, add your account as Instagram Tester (accept the invite in Instagram), **Add account** and **Generate token**.
3. Put the token in the `IG_TOKEN` secret (GitHub: Settings → Secrets → Actions). Never commit it.
4. Fork this repo, edit `queue.json`, enable Actions. Done.

```bash
IG_TOKEN=... node publish.mjs --dry-run   # what would go out now
IG_TOKEN=... node publish.mjs             # publish what is due
IG_TOKEN=... node publish.mjs --types FEED,STORIES   # slot mode: next feed + next story
IG_TOKEN=... node publish.mjs --one FEED https://.../photo.jpg "caption"
```

| Variable | Default | Meaning |
|---|---|---|
| `IG_TOKEN` | required | Instagram user access token |
| `QUEUE` / `STATE` | `queue.json` / `state.json` | file paths |
| `TZ_OFFSET_MIN` | `0` | your UTC offset in minutes |
| `MIN_GAP_MIN` | `30` | minimum minutes since the previous run's last post |
| `MAX_PER_DAY` | `8` | hard daily cap |
| `MAX_PER_RUN` | `3` | items per run (a few minutes apart) |
| `MAX_FEED` / `MAX_REELS` / `MAX_STORIES` | `3` / `2` / `3` | per-type daily caps, counted on your live profile |
| `TOPIC_GAP_H` | `24` | hours before an item with the same `topic` can go out |

## Media requirements (Meta)

Feed: JPEG, aspect 4:5 to 1.91:1. Stories: 9:16. Reels: MP4 (H.264 + AAC), 9:16, 3 s to 15 min. Meta's limit is 100 API posts per 24 h; this tool stays far below it on purpose.

## Good citizenship

Use it for your own content on your own accounts. Do not use it to spam, mass-follow or message people who did not opt in; that breaks Meta's terms and privacy laws (LGPD, GDPR).

## License

MIT
