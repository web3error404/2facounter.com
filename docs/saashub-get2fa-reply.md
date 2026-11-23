# SaaSHub / Get2FA.online — competitor notice, Nov 23 2026

**Decision: decline the reciprocal listing.** Keep the SaaSHub profile only.

## Why

- The notice is a link swap. SaaSHub's own wording says the swap only affects
  `get2fa.online`'s alternatives page — the 2FACounter profile at
  `saashub.com/2fa-counter` stays live either way.
- `get2fa.online` was added to SaaSHub on 2026-11-22, one day before the notice,
  and is filed under "Twitter Automation". It is the same product as ours:
  paste a secret / otpauth:// / QR, Web Crypto, key never sent, bulk mode,
  Google Authenticator export import, the same guide set, the same languages,
  ad-supported.
- Reciprocal competitor links are a link scheme by Google's definition. The
  upside is close to zero; the downside is a link from an established domain
  into a near-identical competitor.

## What was verified

- The notice itself is genuine: DKIM `d=saashub.com` passes. The odd
  `mailed-by: 2facounter.com` is Cloudflare Email Routing rewriting the
  envelope sender on forward (SPF includes `_spf.mx.cloudflare.net`), not spoofing.
- `saashub.com/2fa-counter` exists, carries "Officially verified details",
  and points at `https://2facounter.com`.
- `saashub.com/2facounter` 404s — the slug includes the hyphen.

## Reply to send

From `hello@2facounter.com` to `system@saashub.com`,
subject `Re: 2FACounter: competitor notice - Get2FA.online`.

```
Hi SaaSHub team,

Thanks for the note about Get2FA.online.

I'll pass on the reciprocal listing, so please leave 2FACounter off
Get2FA.online's alternatives page. We're happy to keep our own listing on
SaaSHub — that's where we want to be found — but we don't take part in
link exchanges with other sites.

If the SaaSHub listing for 2FACounter can stay live independently of that
swap, please keep it as it is. Just let me know if anything needs
confirming from our side.

Best,
Shishir
```

Revisit on 2026-12-23: does `get2fa.online` still exist, and has it copied
our copy verbatim? Same concept and feature list is legal; lifted text is not.
