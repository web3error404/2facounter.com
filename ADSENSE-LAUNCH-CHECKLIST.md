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
     from Google's serving domains…" (and update the "Two, by design" count)
   - Keep the current DoubleClick + adssettings/aboutads opt-out text (already
     in the Google advertising section — that matches Google's required
     disclosure).

3. **EU/EEA/UK consent:**
   - **DONE for analytics (2026-11-10):** Consent Mode v2 is implemented —
     analytics storage is denied by default, a localized consent banner gates
     GTM/GA loading, and a footer "Cookie settings" link reopens the choice.
   - **Still required before personalized ads ship:** enable a Google-certified
     CMP (AdSense "Privacy & messaging") or serve non-personalized ads — the EU
     user consent policy requires a certified CMP for advertising cookies. The
     current banner covers analytics only; ad_storage stays denied.

4. **ads.txt:** `public/ads.txt` is a comment-only placeholder. Fill in the
   real publisher ID line (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT,
   f08c47fec0942fa0`) — never an invented ID.

5. **Placement rules (Google Publisher Policies):** no ads near buttons or the
   copy/clear controls that could drive accidental clicks; no ads that mimic
   site UI; don't encourage clicks; keep ad density modest on guide pages.
