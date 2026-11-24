// The evidence base behind claim-audit's contradiction check.
//
// Each entry records a feature a vendor's own documentation says does not
// exist, together with the article that says so, the date it was read, and the
// exact proposition being contradicted. The audit treats these fields as
// authoritative: it refuses to run an entry that is missing one, and it quotes
// them verbatim in every failure message, so the report can never describe
// stale evidence as current.
//
// This is a contradiction detector, not a fact-checker. Three outcomes stay
// distinct and must never collapse into one status:
//
//   1. A sentence contradicts a documented absence — the only outcome this
//      table reports, and it says which proposition and which source.
//   2. A sentence asserts something the table has no evidence about — not
//      reported here; absence of a rule is not evidence of a false claim.
//   3. A sentence cites a real source that does not support it — not reported
//      by this rule either; that needs the citation read, not matched.
//
// A green run therefore means "no known contradiction found", never "every
// claim is true". Do not let the confidence of the label exceed the evidence.
//
// Kept in its own module so that claim-audit-selftest.mjs can mutate a copy and
// prove the reporting pipeline reads from here rather than from a hard-coded
// string.
//
// Adding an entry means: read the vendor's article, quote the sentence that
// states the absence, and date the read. Do not add an entry from memory.

export const ABSENT = [
  {
    name: 'PayPal',
    // A sentence must name the vendor, name the topic, and assert the feature.
    // Co-mention is not a claim: "Unlike PayPal, Discord issues recovery codes"
    // names both and is true.
    vendor: /PayPal/i,
    topic: /\brecovery[\s-]?codes?\b/i,
    asserts: /\b(issues?|issued|provides?|provided|offers?|offered|gives?|given|hands?|downloads?|printed|prints?|saves?|generates?|includes?|come[s]? with|available)\b/i,
    // Denials and comparisons cancel the assertion. Without this, the true
    // sentence "PayPal documents no recovery-code list" would fail.
    denies: /\b(no|none|not|never|without|doesn't|does not|isn't|aren't|no longer|unlike|whereas|instead|rather than|compared)\b/i,
    proposition: 'PayPal 2-step verification issues no recovery codes and documents no recovery-code list.',
    // Evidence: the live article, and the day it was read. The article was
    // read through a text reader because paypal.com answered this machine with
    // HTTP 403; that is why the byline on /guides/paypal/ says so.
    source: 'https://www.paypal.com/us/cshelp/article/what-is-2-step-verification-help167',
    checked: '2026-11-23',
  },
];
