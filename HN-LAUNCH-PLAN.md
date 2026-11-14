# Show HN Launch Plan — day-by-day (written 2026-11-12)

The copy-paste content lives in `SHOW-HN-POST.md`. This file is the calendar.
Work top to bottom, check off as done.

Launch window: **Tue Nov 17 / Wed Nov 18 / Thu Nov 19, 7–9 AM Eastern**.

---

## ✅ Done before this plan existed (2026-11-12)

- [x] Cloudflare Web Analytics removed — site makes zero third-party requests
- [x] Privacy policy / about / FAQ wording truthful ("no analytics")
- [x] CSP tightened, deployed to production (version 5f1c3e84)
- [x] GitHub repo public, AGPL-3.0, pushed, README with screenshots + badges
- [x] Show HN kit written (`SHOW-HN-POST.md`): titles, first comment, replies playbook

---

## Fri Nov 13 — create the account (~15 min)

- [x] Create HN account at news.ycombinator.com → login
      Username = personal handle (web3error404 is fine). NOT "2facounter".
- [x] Verify email (needed to post links)
- [x] Read the front page 10 min — absorb the tone: dry, technical, no marketing
- [x] Comment once on any thread where you have genuine input
      (Sat Nov 14: reply re Zig-vs-C tooling, story 50483611)

## Sat Nov 14 / Sun Nov 15 / Mon Nov 16 — warm-up (~10 min/day)

- [x] ~~Sat Nov 14~~ comment done (Zig/C tooling thread)
- [ ] 1 genuine comment per day (web dev, security, self-hosting threads) — Sun 15, Mon 16
- [ ] Zero mentions of 2facounter.com anywhere. No links at all.
- [ ] Goal: non-zero comment history so launch day reads as a member, not a drive-by

## Mon Nov 16 evening — pre-flight (~20 min)

- [ ] DevTools → Network tab on https://2facounter.com → generate a code
      → confirm only 2facounter.com requests appear
- [ ] One guide page loads correctly on phone (e.g. /guides/github/)
- [ ] GitHub repo logged-out: README shows screenshots + badges
- [ ] Text file ready to paste:
      Title:  Show HN: 2FA Counter – a TOTP/HOTP generator that runs entirely in the browser
      URL:    https://2facounter.com
      Text:   first comment from SHOW-HN-POST.md §2
- [ ] Alarm set for ~6:40 AM Eastern

## Tue Nov 17 — LAUNCH DAY

- [ ] 6:50 AM ET: at the computer, logged in
- [ ] 7:00–7:30 AM ET: HN → submit → title + URL + text (paste from file) → submit
- [ ] 7:30–10 AM ET: reply to EVERY comment; playbook in SHOW-HN-POST.md §5.
      Concede correct criticism loudly. If a real bug is found: acknowledge,
      fix, push, reply "fixed, thanks".
- [ ] NEVER: self-upvote, ask others to upvote, edit title to clickbait
- [ ] Rest of day: check hourly, reply until activity dies (24–36h)

### Decision points

- Front page → expect 5–20k visits/36h; watch uptime; screenshot the thread
- Dead (<10 pts after 3h) → do nothing; no repost for 3 months; mark result
- Either way → log the outcome in BACKLINK-SUBMISSIONS.md

Fallback days: Wed Nov 18 or Thu Nov 19, same time, same content. If Tuesday
got zero traction before noon, wait a full day rather than reposting.

---

## Filler work while waiting (optional, low effort)

X (Twitter) cadence — started 2026-11-13, Mon/Wed/Fri only (no weekend
posts). Posts so far: Fri Nov 13 (Post 1, clock sync). Next scheduled:
Mon Nov 16 = Post 2 (recovery codes, `x-posts.md`).
Rules: no links in posts (bio only), site URL in bio.

GSC status snapshot (2026-11-12): ~58 pages indexed, 41 "crawled – currently
not indexed" (normal new-domain soft hold; resolves as links arrive — HN
launch accelerates it), 1 harmless redirect page. Request Indexing already
submitted for: /, /what-is-2fa/, /guides/github/, /how-to-get-2fa-code/.
Next GSC check: weekly, not daily.

- [ ] SaaSHub submission (BACKLINK-SUBMISSIONS.md §)
- [ ] StackShare submission
- [ ] Slant submission
- [ ] StartupBase submission
- [ ] Check AlternativeTo review status; once approved, add a "reviewed on"
      badge to the site footer

## After launch — next big rocks

1. Product Hunt (schedule a slot; kit has the copy in BACKLINK-SUBMISSIONS.md §2)
2. awesome-2fa / awesome-security PRs (retry the awesome-list play with the
   clean no-trackers story)
3. Keep the guide flywheel going (one new high-intent guide page per week)
4. AdSense only after sustained traffic; runbook in ADSENSE-LAUNCH-CHECKLIST.md
