export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting AdGuard Home!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  'DNS Server': 4,
  'AdGuard Home is resolving DNS queries': 5,
  'AdGuard Home is not resolving DNS queries. Check its upstream DNS servers.': 6,

  // interfaces.ts
  'The AdGuard Home dashboard and settings': 7,
  'DNS-over-HTTPS': 8,
  'Encrypted DNS endpoint for browsers and operating systems that support DNS-over-HTTPS': 9,
  'Plain DNS': 10,
  'Unencrypted DNS over UDP and TCP on the first port of this range, for routers and resolvers that accept a custom DNS port': 11,

  'DNS-over-TLS': 20,
  'Encrypted DNS for Android Private DNS and other DNS-over-TLS clients': 21,

  // actions/setAdminPassword.ts
  'Set Admin Password': 12,
  'Generate a new random password for the AdGuard Home admin account. If AdGuard Home is running, it restarts to apply the new password.': 13,
  'This replaces the current admin password, and the old one stops working.': 14,
  'AdGuard Home Admin Credentials': 15,
  'Use these credentials to sign in to the AdGuard Home web interface. The password is shown only now; run this action again to replace it.': 16,
  Username: 17,
  Password: 18,

  // init/watchCredentials.ts
  'Set the admin password before using AdGuard Home': 19,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
