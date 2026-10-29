# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- Never let `main.ts` start AdGuard Home with an empty `users` list — AdGuard treats no users as no authentication, leaving the dashboard open.
- Don't move DNS to a single `bindPort` or to a port ≤ 1024: StartOS binds UDP only through `bindPortRange` (≥ 2 ports, all > 1024), and owns port 53 itself.
- Keep the `dot` binding `secure: null`, not `{ ssl: false }` like a DNS port: `ssl: false` would also publish its plaintext TCP port on every LAN and public address.
- Never set `bootstrap_dns` or `fallback_dns` to a public resolver: StartOS drops container DNS on port 53 to any address but `sdk.getOsIp`, so those lookups hang.
