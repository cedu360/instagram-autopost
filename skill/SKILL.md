---
name: instagram-autopost
description: Operate the instagram-autopost robot in this repository. Use when the user wants to add photos, stories or reels to the Instagram posting queue, test what would be posted, check why something did not post, or change posting times.
---

# instagram-autopost

The robot in this repository publishes to Instagram through the official API on a schedule (GitHub Actions, `.github/workflows/autopost.yml`). Default slots, Brasília time: 09:37 photo + story, 11:47 reel, 14:07 photo + story, 16:47 reel, 19:37 photo + story. Each slot takes the next queue item of each type.

## Add content to the queue

1. Put the file in `media/` (JPG for photos/stories, MP4 9:16 for reels/video stories). Keep names short, no spaces.
2. Append one object per post to `queue.json`:
   `{ "id": "<unique>", "type": "FEED" | "STORIES" | "REELS", "url": "https://<user>.github.io/<repo>/media/<file>", "caption": "<text>" }`
   - Stories take no caption. `"approved": false` holds an item; `"at": "YYYY-MM-DDTHH:MM"` (local time) delays it; `"topic"` keeps two posts on the same subject 24 h apart.
   - Never reuse an `id`. Never edit `state.json` by hand (it records what was published).
3. Commit and push. GitHub Pages must be on (Settings → Pages, branch `main`, root) so the URL is public; check it opens before relying on it.

Captions that work: short hook on the first line, 2–3 benefit lines, a clear call to action (download the app / visit the site / link in bio), 3–5 hashtags.

## Test and check

- Dry run locally: `node publish.mjs --dry-run --types FEED,STORIES` (or `--types REELS`). It shows what the next slot would publish. No token needed for a dry run.
- On GitHub: Actions → autopost → Run workflow, tick "Só mostrar o que sairia" to test without posting, or set `tipos` to publish now.
- Why something did not post: open the latest autopost run log. "Waiting: ... cap" = daily limit reached; "Skipped ...: same image / caption too close" = duplicate of something on the profile; "Nothing due" = queue empty for that type.

## Rules

- The token lives only in the repository secret `IG_TOKEN`. Never print it, write it to a file, or paste it in chat.
- Do not raise the daily caps or add more slots than Meta allows; the defaults keep the account safe.
- Do not use it for spam, mass-follow or messages to people who did not opt in.

## Change the times

Edit the `cron` lines in `.github/workflows/autopost.yml` (UTC: Brasília + 3 h) and the `case` that maps each time to `REELS` or `FEED,STORIES`.
