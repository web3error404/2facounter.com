/**
 * Single source of truth for the per-service 2FA setup guides.
 *
 * Used by the guides hub (`/guides/`), the related-guides block in
 * `GuideLayout.astro`, the footer's Guides column, and the homepage's
 * compatibility links. Keeping one ordered list means a new guide is
 * discovered from every place at once — no more four lists drifting apart.
 *
 * Order matters: it is roughly search demand, and the related-guides block
 * rotates through it so inbound links spread across the whole cluster.
 */
export interface GuideEntry {
  /** Site-absolute path, trailing slash included */
  path: string;
  /** Display name of the service */
  service: string;
  /** Time-to-complete shown on the hub and guide badge */
  minutes: number;
  /** Hub card meta line, e.g. "6 min · 6 digits · 30 s" */
  blurb: string;
  /** Hub card description */
  text: string;
  /**
   * Include in the footer Guides column. Kept to the highest-demand guides
   * so the footer stays a navigation aid rather than a link dump; every
   * guide is still linked from the hub and the related-guides block.
   */
  footer?: boolean;
}

export const GUIDES: GuideEntry[] = [
  {
    path: '/guides/google/',
    service: 'Google',
    minutes: 6,
    blurb: '6 min · 6 digits · 30 s',
    text: 'Enable 2-Step Verification with a standard TOTP key — and skip Google Authenticator’s cloud-sync upload.',
    footer: true,
  },
  {
    path: '/guides/microsoft/',
    service: 'Microsoft',
    minutes: 5,
    blurb: '5 min · 6 digits · 30 s',
    text: 'Protect Outlook, Windows and Xbox sign-ins with browser-generated codes, no Authenticator app install.',
    footer: true,
  },
  {
    path: '/guides/amazon/',
    service: 'Amazon',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Turn on Amazon’s Two-Step Verification with an authenticator app instead of SMS — the shopping account is separate from AWS.',
    footer: true,
  },
  {
    path: '/guides/facebook/',
    service: 'Facebook',
    minutes: 5,
    blurb: '5 min · 6 digits · 30 s',
    text: 'Set up authenticator-app 2FA in Meta Accounts Center and keep your Facebook login phone-independent, with a QR-screenshot fallback if no setup key appears.',
    footer: true,
  },
  {
    path: '/guides/github/',
    service: 'GitHub',
    minutes: 6,
    blurb: '6 min · 6 digits · 30 s',
    text: 'Meet GitHub’s mandatory 2FA requirement using TOTP you can regenerate on any shared machine.',
    footer: true,
  },
  {
    path: '/guides/instagram/',
    service: 'Instagram',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Enable TOTP 2FA via Accounts Center — the method that doesn’t die with your SIM card.',
    footer: true,
  },
  {
    path: '/guides/discord/',
    service: 'Discord',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Protect your Discord account and server — enable 2FA and generate codes with or without the mobile app.',
    footer: true,
  },
  {
    path: '/guides/dropbox/',
    service: 'Dropbox',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Add two-step verification to Dropbox with a portable TOTP key, and keep file access working without a phone.',
    footer: true,
  },
  {
    path: '/guides/linkedin/',
    service: 'LinkedIn',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Turn on LinkedIn’s two-step verification and generate the 6-digit code from any browser you trust.',
    footer: true,
  },
  {
    path: '/guides/tiktok/',
    service: 'TikTok',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Swap TikTok’s two-step verification from SMS to an authenticator app, and generate the code in any browser.',
    footer: true,
  },
  {
    path: '/guides/paypal/',
    service: 'PayPal',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Protect a money-moving account with authenticator-app 2FA — and audit your enrolled methods afterwards.',
    footer: true,
  },
  {
    path: '/guides/binance/',
    service: 'Binance',
    minutes: 5,
    blurb: '5 min · 6 digits · 30 s',
    text: 'Turn on TOTP 2FA for your Binance account — better withdrawal security without installing apps.',
    footer: true,
  },
  {
    path: '/guides/coinbase/',
    service: 'Coinbase',
    minutes: 3,
    blurb: '3 min · 6 digits · 30 s',
    text: 'Lock a crypto exchange account behind TOTP — no phone dependency, no SMS SIM-swap exposure.',
    footer: true,
  },
  {
    path: '/guides/kraken/',
    service: 'Kraken',
    minutes: 3,
    blurb: '3 min · 6 digits · 30 s',
    text: 'Set up Kraken’s sign-in 2FA and its Master key in any browser.',
    footer: true,
  },
  {
    path: '/guides/aws/',
    service: 'AWS',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Assign a virtual MFA device to IAM users or root and generate the two consecutive codes AWS demands.',
  },
  {
    path: '/guides/x/',
    service: 'X / Twitter',
    minutes: 5,
    blurb: '5 min · 6 digits · 30 s',
    text: 'Turn on app-based 2FA on X — safer than SMS, which is now Premium-only.',
    footer: true,
  },
  {
    path: '/guides/twitch/',
    service: 'Twitch',
    minutes: 5,
    blurb: '5 min · 6 digits · 30 s',
    text: 'Enable Twitch two-factor authentication with an authenticator app and protect your stream key and channel.',
  },
  {
    path: '/guides/epic-games/',
    service: 'Epic Games',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Secure Fortnite, Rocket League and Epic purchases with authenticator-app 2FA — and keep the backup codes.',
  },
  {
    path: '/guides/slack/',
    service: 'Slack',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Add an authenticator app to Slack, see where workspace SSO already covers you, and save the recovery codes.',
  },
  {
    path: '/guides/zoom/',
    service: 'Zoom',
    minutes: 4,
    blurb: '4 min · 6 digits · 30 s',
    text: 'Set up Zoom two-factor authentication with a TOTP key that works on any device, even without the mobile app.',
  },
  {
    path: '/guides/steam/',
    service: 'Steam',
    minutes: 5,
    blurb: '5 min · Steam variant',
    text: 'Steam Guard explained — enroll the official app, trading restrictions, and why no browser generator can produce Steam codes.',
  },
];

/** Guides shown in the footer column (curated subset, in display order). */
export const FOOTER_GUIDES = GUIDES.filter((guide) => guide.footer);
