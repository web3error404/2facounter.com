# Show HN Launch Kit — 2FA Counter

Status: NOT POSTED YET. Complete the pre-flight checklist, then post.
HN rules: https://news.ycombinator.com/showhn — title must be the *product*,
no clickbait, no marketing speak, no voting rings (asking friends to upvote
is against the rules and gets flagged).

---

## 1. Title (pick one, keep "Show HN:" prefix)

1. `Show HN: 2FA Counter – a TOTP/HOTP generator that runs entirely in the browser`
2. `Show HN: Browser-based 2FA code generator with zero third-party requests`
3. `Show HN: 2facounter.com – paste a secret, get a TOTP code, nothing leaves your browser`

**Recommended: #1.** Plain, product-first, describes exactly what it is.
The no-analytics story belongs in your text, not the title.

The URL field: `https://2facounter.com` (the tool itself — not the GitHub repo;
HNSelf-promo rules are fine for Show HN, but link what people can try).
Mention the repo prominently in the text instead.

## 2. First comment (the "text" of the post)

Copy-paste ready:

```
I built this because there are moments when you need a 2FA code and can't
install anything: a borrowed laptop, a work machine without install rights,
a device you don't want to log an account into.

Paste the Base32 secret (or scan a QR code with the camera / drop a QR
screenshot) and you get a live TOTP/HOTP code. Everything is generated
locally with the Web Crypto API — RFC 6238/4226, HMAC-SHA-1/256/512.
Keys exist only in the open page's memory: no localStorage, no cookies,
no IndexedDB, no cloud sync. Refreshing wipes them.

The honest part of the story: this site used to ship Google Tag Manager +
Google Analytics. I submitted it to the awesome-privacy list and it was
rejected — correctly — because a tracker on a privacy tool is exactly the
kind of contradiction that list exists to catch. So this week I removed
GTM/GA, then removed the remaining Cloudflare Web Analytics beacon too.
The site now makes zero third-party requests: fonts, the QR decoder
(jsQR), images and scripts are all bundled and served from the same
domain. Open the network tab and watch it.

Source (AGPL-3.0): https://github.com/web3error404/2facounter.com
Privacy policy, for the record: https://2facounter.com/privacy/

Things I'll admit up front, since they're the real questions:

1. Does this replace Aegis/2FAS/Bitwarden on your phone? No. Use those.
   This is for the edge cases above. The recovery codes are still the
   airbag for any 2FA setup.

2. Can't a malicious future version log keys? Nothing stops me except
   the AGPL license and the fact that the tool demonstrably works offline
   (disconnect after load — it keeps generating). The CSP in
   worker.mjs/_headers pins scripts to 'self' so the same page that
   generates codes can't ship your keys anywhere without a deploy that
   changes both. Audit it; that's the point of the license.

3. Browser memory vs. phone app security? An XSS on this site would be
   game over, same as any web page. The mitigations are no server, no
   inputs that hit the network, a locked-down CSP, and memory-only keys
   that vanish on refresh. If that trust model doesn't work for you, that
   is a completely reasonable conclusion.

Happy to answer anything else. Flambé my threat model in the comments —
that's half the reason I'm posting here.
```

## 3. Launch timing

- **Best window:** Tuesday–Thursday, **7–9 AM US Eastern** (front page has the
  longest runway before the US evening crowd; 12:01 AM PT / 3:01 AM ET also
  works for a full US day).
- **Avoid:** weekends (low traffic), Friday afternoon, and posting while any
  part of the site is still deploying/changed-but-not-live.
- Account: create it **now**, comment on a few threads over 3–5 days first.
  A zero-history account posting its own project is fine for Show HN, but a
  warm account reads better to mods and voters.
- Username: use your personal handle, **not** "2facounter" — HN downranks
  brand-named accounts and it reads as astroturf.

## 4. Pre-flight checklist (the day before)

- [ ] Live site re-verified: network tab on the homepage shows only 2facounter.com requests
- [ ] Generate a code on the live site with DevTools open — confirm zero external requests
- [ ] GitHub repo has a README with screenshots/GIF and the AGPL badge
- [ ] `verify-release.mjs` passes against production
- [ ] Comments below (replies playbook) read once, out loud
- [ ] HN account warmed, logged in, title + URL + text saved in a text file

## 5. Replies playbook (the comments you WILL get)

| Comment | Your reply (short versions) |
|---|---|
| "Why would anyone paste their secret into a website? This is a phishing pattern." | "It is — and that's the strongest criticism. The difference is verifiability: AGPL source, no server, works offline, zero third-party requests. A phishing site can't offer any of those. But if this pattern makes you uncomfortable, don't use it — that instinct is correct for most people." |
| "Just use Aegis / Bitwarden / 2FAS." | "Agreed, and the post says so — this is for borrowed/work machines where you can't install. It's a complement, not a replacement." |
| "XSS = game over." | "Yes. Same for every web authenticator. Mitigations: CSP pinned to self, no network I/O from the tool, keys memory-only. If you need stronger guarantees, use an installed app — deliberately not competing with that." |
| "HOTP support? Steam? YubiKey?" | Answer honestly from the current state; HOTP is in, Steam non-standard encoding is NOT supported (be truthful, it's a known limitation). |
| "Why is there a domain if there's no server?" | "Static assets on Cloudflare Pages/Workers; the 'server' serves files and does nothing else. The tool works with the network disconnected." |
| Anything factually wrong about the tool | Correct it immediately, cite the repo line. Being corrected *fast and gracefully* is the best look on HN. |

Rules of engagement:
- Reply within the first 2 hours as much as you can; the first hour decides the fate of the post.
- Never argue tone, only facts. Concede correct criticisms loudly ("you're right about X").
- Do not upvote your own post, do not ask anyone to. HN flags self-voting rings.
- If it dies silently (<10 points in 3h), do NOT repost within 3 months; improve the product and try the HN launch later as part of a bigger release.

## 6. If it hits the front page

- Expect 5–20k visits over ~36 hours, mostly single-session curious devs.
- Traffic will NOT convert to regulars unless there's a reason to return —
  that's the guides content; make sure the guides index is linked in the header.
- Screenshot/record everything: the HN thread URL is a permanent backlink and
  résumé material.
- Watch uptime — a crash during a front-page run is the story that gets remembered.
