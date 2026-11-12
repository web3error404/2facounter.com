# AdSense launch checklist — 2facounter.com

Internal checklist (moved out of `src/pages/privacy.astro` on 2026-11-10 so it
no longer ships in production HTML). Work through this the day ad code ships.

1. **Update the privacy policy.** Ads set cookies and make third-party
   requests; the statements in "What this site collects", "Cookies", and
   "Third-party requests" ("two measurement tools", "two third-party requests")
   become false once ad scripts load — which would violate Google's Privacy
   disclosures / Dishonest declarations policies if left untouched.

2. **Required privacy-policy replacements when ads ship:**
   - Body lead: "Nothing from this site itself. Google's ad partners, however,
     may use cookies…"
   - Cookies section: add an "Advertising cookies (Google AdSense)…" paragraph
   - Third-party requests: add "Ads served through Google may load scripts
     from Google's serving domains…" (and update the "One, by design" count)
   - Keep the current DoubleClick + adssettings/aboutads opt-out text (already
     in the Google advertising section — that matches Google's required
     disclosure).

3. **EU/EEA/UK consent:**
   - **Removed 2026-11-12:** the analytics consent banner was taken down
     together with GTM/GA — the only remaining measurement tool (Cloudflare
     Web Analytics) is cookieless and stores nothing, so no consent prompt is
     needed for it.
   - **Still required before personalized ads ship:** re-add a consent banner
     and enable a Google-certified CMP (AdSense "Privacy & messaging") or
     serve non-personalized ads — the EU user consent policy requires a
     certified CMP for advertising cookies. A localized banner implementation
     exists in git history (Layout.astro before the GTM removal commit) and
     can be restored for ads.

4. **ads.txt:** `public/ads.txt` is a comment-only placeholder. Fill in the
   real publisher ID line (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT,
   f08c47fec0942fa0`) — never an invented ID.

5. **Placement rules (Google Publisher Policies):** no ads near buttons or the
   copy/clear controls that could drive accidental clicks; no ads that mimic
   site UI; don't encourage clicks; keep ad density modest on guide pages.
