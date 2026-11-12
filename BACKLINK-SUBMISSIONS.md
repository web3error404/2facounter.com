# Backlink Submission Kit — 2facounter.com

Working through this top-to-bottom = fastest backlinks for a new domain.
Check off each item as submitted. All copy is copy-paste ready.

- [x] AlternativeTo — ✅ submitted 2026-11-12 (in review queue; added 7 alternatives incl. Google Authenticator, Authy, 2FAS, Microsoft Authenticator, Aegis, Ente Auth, Proton Authenticator. Don't share the listing URL until approved. Profile: account "2FA COUNTER" with logo set)
- [ ] Product Hunt (needs scheduling — see notes)
- [ ] Hacker News (Show HN) — full kit ready in `SHOW-HN-POST.md` (title options, first comment, replies playbook, timing)
- [x] GitHub awesome-lists — PR 1 of 3: ❌ awesome-privacy CLOSED 2026-11-12
      → https://github.com/lissy93/awesome-privacy/pull/896 (declined: closed-source requirement; also cited GTM, which was already removed — corrected for the record in the closing thread)
- [ ] GitHub awesome-lists — PR 2 of 3: awesome-2fa repo (search GitHub for one)
- [ ] GitHub awesome-lists — PR 3 of 3: awesome-security repo
- [ ] SaaSHub
- [ ] StackShare
- [ ] Slant
- [ ] StartupBase

---

## 1. AlternativeTo (easiest, do first)

**URL:** https://alternativeto.net
**Where:** Submit app → "Add application"
**List as alternative to:** Google Authenticator, Authy, 2FAS, Microsoft Authenticator,
Aegis Authenticator, andOTP (list ALL of these — each adds a discovery path)

**Name:**
```
2FA Counter
```

**Official description:**
```
2FA Counter is a free online TOTP authenticator. Paste your secret key and get a
live 2FA verification code in seconds — no app install, no account, no phone
needed. Works entirely in your browser: codes are generated locally with
JavaScript and never leave your device. Supports TOTP codes for any service
(GitHub, Google, Binance, Discord, Steam and more), with multiple language
versions and step-by-step setup guides for popular platforms.
```

**Category:** Security & Privacy → Authentication
**Tags:** `totp`, `2fa`, `two-factor-authentication`, `authenticator`, `web-based`, `no-install`, `privacy`
**License:** Free
**Website:** https://2facounter.com

---

## 2. Product Hunt

**URL:** https://producthunt.com
**Where:** Post a product (requires account; you pick a launch date/time slot)
**Note:** Launch at 12:01 AM PT for full-day visibility. Prepare your maker profile
before launch day. Have 2–3 friends/colleagues ready to upvote early.

**Tagline (60 char max):**
```
Get your 2FA codes in your browser — no app install
```

**Description:**
```
2FA Counter is a free online TOTP authenticator. Paste your 2FA secret key and
get a live verification code instantly — in your browser, nothing installed.

🔑 Key points:
• No app, no sign-up, no phone number needed
• Codes are generated locally in your browser — secrets never leave your device
• Works with any TOTP service: Google, GitHub, Discord, Binance, Steam, AWS…
• Step-by-step setup guides for 11 popular platforms
• Available in 14 languages

Great when you're setting up 2FA on a new device, switching phones, lost your
authenticator app, or just don't want another app installed.

Free forever.
```

**First comment (post as maker, right after launch):**
```
I built this after a common scenario: setting up 2FA on a work laptop where you
can't install software, or your phone is in the other room and GitHub wants a
code NOW.

The whole thing runs client-side — your secret key never touches a server, so
it's as safe as typing it into your local authenticator app. No account, no
tracking of what you type.

Happy to answer questions about TOTP, 2FA security, or the implementation!
```

**Topics:** `Security & Privacy`, `Developer Tools`
**Gallery image:** use your existing og.webp screenshot

---

## 3. Hacker News (Show HN)

**URL:** https://news.ycombinator.com
**When:** Weekday mornings US time (8–10 AM ET). Avoid weekends.

**Title:**
```
Show HN: 2FA Counter – free online TOTP authenticator, codes stay in your browser
```

**Text (first comment, post immediately after submitting):**
```
Hi HN! I built 2FA Counter after seeing the same pain point over and over:
people setting up 2FA on machines where they can't install software, or
needing a code when their phone isn't handy.

How it works: paste your TOTP secret (base32), and the page generates live
rolling codes entirely client-side. The secret never leaves your browser tab —
there is no server-side secret handling at all. No account, no cookies needed
for the core function.

I also wrote setup guides for 11 services (GitHub, Google, Discord, Steam,
Binance, AWS…) and comparisons of TOTP vs passkeys/Authy/Google Authenticator:
https://2facounter.com/guides/

Stack: Astro, static pages, no backend for code generation.

Feedback welcome — especially on security ergonomics and accessibility.
```

**Note:** HN links are nofollow but the crawl + referral traffic from a decent
ranking gets you indexed fast and noticed by other list curators.

---

## 4. GitHub awesome-lists (3 PRs)

**How:** Go to each repo → open a PR adding one line to the appropriate section.
Read each repo's CONTRIBUTING.md first — most require alphabetical order.

### a) Lissy93/awesome-privacy — 🔒 CLOSED → repo now public, reconsideration requested (PR #896)

> **Status:** closed 2026-11-12 (closed-source rule) → **repo made PUBLIC 2026-11-12
> (AGPL-3.0)** → follow-up comment posted asking for reconsideration
> (https://github.com/lissy93/awesome-privacy/pull/896#issuecomment-6817401644).
> Author cannot reopen; a maintainer must. If declined again, drop it and move on.
> If not merged after ~2 weeks, comment politely on the PR asking for review.
> If the maintainers request changes, match the entry schema they point to.
>
> **Note (2026-11):** the repo no longer uses README sections. Entries live in
> `awesome-privacy.yml` under `categories → Essentials → sections → "2-Factor
> Authentication" → services`. The submitted entry:
>
> ```yaml
>       - name: 2FA Counter
>         url: https://2facounter.com
>         icon: https://2facounter.com/favicon-96x96.png
>         followWith: Web
>         description: |
>           Free web-based TOTP authenticator. Paste your secret key and get a live
>           2FA code in seconds — generated entirely in the browser, no install,
>           no account, secrets never leave the device.
> ```

### b) Search GitHub for `awesome-2fa` and `awesome-two-factor`
```markdown
- [2FA Counter](https://2facounter.com) - Free online TOTP generator. No app, no account — codes computed locally in your browser.
```

### c) htr-tech/awesome-security or similar security lists → "Authentication" section
```markdown
- [2FA Counter](https://2facounter.com) - Online TOTP authenticator with client-side code generation and setup guides for popular platforms.
```

**PR title:** `Add 2FA Counter (online TOTP authenticator)`
**PR body:**
```
Adds 2FA Counter to the [section name] section.

- Free, no account required
- Client-side TOTP generation (secrets never sent to a server)
- Maintained, 14 languages, setup guides for 11 major services
- https://2facounter.com

Fits the list's criteria because: [check the repo's stated criteria and
confirm one line here]
```

---

## 5. SaaSHub

**URL:** https://saashub.com
**Where:** "Submit service"
**List as alternative to:** Google Authenticator, Authy, 2FAS

**Short description:**
```
2FA Counter is a free web-based TOTP authenticator. It generates live two-factor
authentication codes entirely in your browser — no installation, no account, and
secrets never leave your device. Includes setup guides for 11 major services and
is available in 14 languages.
```

---

## 6. StackShare

**URL:** https://stackshare.io
**Where:** Add a tool (Tools → Submit)
**Short description (reuse):**
```
Free online TOTP authenticator. Paste your secret key, get a live 2FA code in
seconds — generated locally in your browser, nothing installed, no account.
```

---

## 7. Slant

**URL:** https://www.slant.co
**Where:** Suggest a product under "What are the best two-factor authentication apps?"

**One-liner:**
```
Web-based TOTP authenticator — no install, no account, secrets never leave your browser.
```

---

## 8. StartupBase

**URL:** https://startupbase.io
**Where:** Submit startup

**Tagline:**
```
Free online 2FA authenticator — TOTP codes in your browser, no app install
```

**Description:**
```
2FA Counter generates two-factor authentication codes entirely in your browser.
Paste your secret key and get a live TOTP code in seconds — no app, no sign-up,
no phone needed, and your secret never leaves your device. Includes setup guides
for GitHub, Google, Discord, Binance, Steam, AWS and more. Free forever.
```

---

## After submitting

1. Log each submission date here so you can chase approvals:

   | Directory | Submitted | Live? |
   |---|---|---|
   | AlternativeTo | 2026-11-12 (app + 7 alternatives linked) | ⏳ in review queue |
   | Product Hunt | | |
   | Show HN | | |
   | awesome-privacy PR | 2026-11-12 (PR #896) | ❌ declined (closed-source rule) |
   | awesome-2fa PR | | |
   | awesome-security PR | | |
   | SaaSHub | | |
   | StackShare | | |
   | Slant | | |
   | StartupBase | | |

2. Once 3–4 are live, verify the links resolve: `node verify-release.mjs` or a
   quick crawl of your referrers in GSC (Performance → filter by referring pages
   won't show this — check each live listing manually).

3. Do NOT submit everything in one day — spread over 1–2 weeks so the link
   profile looks organic.
