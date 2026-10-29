<p align="center">
  <img src="icon.svg" alt="AdGuard Home Logo" width="21%">
</p>

# AdGuard Home on StartOS

> Everything not listed in this document should behave the same as upstream
> AdGuard Home. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[AdGuard Home](https://github.com/AdguardTeam/AdGuardHome) is a DNS server that filters ads, trackers, and malicious domains for every client that resolves through it. This package runs it on StartOS with the admin account managed by StartOS and its DNS reachable over DNS-over-HTTPS, DNS-over-TLS, and a high-numbered plain DNS port.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs the upstream image unmodified, with its own entrypoint and default arguments.

| Property      | Value                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Image         | `adguard/adguardhome` (upstream, unmodified)                                                                         |
| Architectures | x86_64, aarch64                                                                                                      |
| Entrypoint    | Upstream default: `AdGuardHome --no-check-update -c /opt/adguardhome/conf/AdGuardHome.yaml -w /opt/adguardhome/work` |

One subcontainer, `adguard-home-sub`, runs the single daemon `adguard-home`. Attach with `start-cli package attach adguard-home -n adguard-home-sub -- sh`.

Upstream's in-app self-update is disabled by the image's `--no-check-update` flag; AdGuard Home is updated by installing a new package version.

## Volume and Data Layout

Everything lives on one volume, `main`, split into the two directories upstream uses plus the package's own state file.

| Path on `main`          | Mounted at              | Contents                                                                |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `conf/AdGuardHome.yaml` | `/opt/adguardhome/conf` | The full AdGuard Home configuration                                     |
| `work/`                 | `/opt/adguardhome/work` | `data/`: query log, statistics (`stats.db`), sessions, downloaded lists |
| `store.json`            | not mounted             | StartOS-side state: the bcrypt hash of the admin password               |

There is no external database. Query log and statistics grow with traffic and with the retention set in AdGuard's settings.

## File Models

The package owns a few keys in AdGuard Home's config and keeps its own state file. Everything else in the config belongs to AdGuard Home and the user.

**`conf/AdGuardHome.yaml`** (YAML). AdGuard Home fills in every default the package doesn't write (the AdGuard DNS filter, the rate limit, and so on) and rewrites the file whenever settings change in its UI.

**On install**, the package writes these starting values. They are ordinary AdGuard settings afterwards: changes made in AdGuard's UI stick.

| Key                                        | Value                                                     | Why                                                                                             |
| ------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `dns.upstream_dns`                         | `https://9.9.9.10/dns-query`, `https://1.1.1.1/dns-query` | Two providers addressed by IP: no bootstrap lookup needed, and one failing doesn't fail lookups |
| `dns.upstream_mode`                        | `parallel`                                                | Each query goes to every upstream; the fastest answer wins                                      |
| `dns.fallback_dns`                         | the StartOS DNS address                                   | Used only when every upstream fails; always reachable from the container                        |
| `dns.cache_optimistic`                     | `true`                                                    | Expired cache entries are answered at once and refreshed in the background                      |
| `querylog.interval`, `statistics.interval` | `7d`                                                      | A smaller query log and a week of statistics                                                    |
| `querylog.ignored`, `statistics.ignored`   | `one.one.one.one`, with `ignored_enabled: true`           | Keeps the DNS health check's lookups out of the query log and statistics                        |

**Before every start**, the package re-asserts these keys, overriding any edit:

| Key                         | Value                                              | Why                                                           |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `http.address`              | `0.0.0.0:3000`                                     | The port the web interface is bound to                        |
| `http.doh.insecure_enabled` | `true`                                             | StartOS terminates TLS, so DoH arrives as plain HTTP          |
| `users`                     | one user, `admin`, with the hash from `store.json` | The package owns the credential                               |
| `dns.bind_hosts`            | `["0.0.0.0"]`                                      | Listen on the container's interfaces                          |
| `dns.port`                  | `5300`                                             | The port the plain DNS range is bound to                      |
| `dns.trusted_proxies`       | loopback plus the StartOS bridge address           | So the query log can attribute DoH queries to the real client |
| `dns.bootstrap_dns`         | the StartOS DNS address                            | StartOS drops container DNS on port 53 to any other address   |

Changing the web or DNS listen address, or the bootstrap servers, in AdGuard's own settings therefore reverts on the next start. AdGuard's default bootstrap servers are public resolvers on port 53, which StartOS never lets a container reach, so without this lock an upstream given as a hostname (AdGuard's own default, `https://dns10.quad9.net/dns-query`) never resolves. All other settings (filters, upstreams, rules, clients, retention) are left alone and survive restarts and updates. The `tls` section is unused: encryption is handled by StartOS.

**On update from `0.107.79:0`**, a migration adds `one.one.one.one` to both ignored lists and turns `ignored_enabled` on. It changes nothing else: the install values above are not applied to an existing install.

**`store.json`** (JSON). Holds `adminPasswordHash`, written only by the Set Admin Password action. The plaintext password is never stored.

## Dependencies

None.

## Network Access and Interfaces

The package exposes three hosts: the web host carries the dashboard and the DoH endpoint, the `dot` host carries DNS-over-TLS, and the `dns` host carries plain DNS.

| Interface id | Type | Port                               | Protocol                 | Purpose                                        |
| ------------ | ---- | ---------------------------------- | ------------------------ | ---------------------------------------------- |
| `ui`         | ui   | 3000                               | HTTP (TLS by StartOS)    | AdGuard Home dashboard                         |
| `doh`        | api  | 3000, path `/dns-query`            | HTTP (TLS by StartOS)    | DNS-over-HTTPS endpoint                        |
| `dot`        | api  | 5300 (TCP), TLS port preferred 853 | raw TCP (TLS by StartOS) | DNS-over-TLS                                   |
| `dns`        | api  | 5300–5301 range                    | raw UDP + TCP, no TLS    | Plain DNS on 5300; 5301 is reserved and unused |

The `dns` interface is a port range because StartOS binds UDP only as a range of two or more ports. AdGuard listens on the first port only. StartOS forwards the range without rewriting the source address, so AdGuard sees whoever sent the query: a device that queries port 5300 directly appears as itself, and a resolver forwarding for other devices appears as that resolver (a StartTunnel subnet whose DNS points here appears as the subnet's `.1` address).

The `dot` binding is `protocol: null`, `secure: null`, with `addSsl` preferring external port 853. StartOS terminates TLS and forwards the plain DNS-over-TCP stream to AdGuard's TCP listener on 5300 (the same listener the `dns` range uses; each host checks overlaps on its own). Services can't claim external ports at or below 1024, so StartOS assigns a random port of 49152 or above instead of 853; Android Private DNS needs a router forward from 853 to it, plus a public domain with a Let's Encrypt certificate. `secure: null` keeps the binding's plaintext port on the server itself, so off-box clients reach it only through TLS.

AdGuard's web UI also offers DNS-over-TLS, DNS-over-QUIC, DNSCrypt, and HTTPS settings under **Encryption**. None of those listeners is bound by this package, so enabling them has no effect from outside the container. DoT is served by StartOS's TLS termination instead.

## Installation and First-Run Flow

The upstream first-run setup wizard (port 3000 on a fresh install) is never shown. The package writes the config itself before AdGuard Home starts.

1. On install, a critical task asks the user to run **Set Admin Password**. The service cannot start until it has run, because AdGuard Home with no users would leave the dashboard open to anyone.
2. The action generates a 24-character password, stores its bcrypt hash, and shows username `admin` plus the password once.
3. During install the package writes the starting values above; on start it writes the locked keys, and AdGuard Home fills in its remaining defaults, including the AdGuard DNS filter.

## Actions

**Set Admin Password** (`set-admin-password`)

- **When to run it**: on install (the critical task points to it), or whenever the admin password is lost or should be rotated.
- **What it changes**: replaces `adminPasswordHash` in `store.json`. On the next start the `users` entry in `AdGuardHome.yaml` is rewritten with it.
- **Cost**: instant. If the service is running, it restarts (a few seconds of DNS downtime) to load the new password. Existing dashboard sessions are not explicitly revoked by the package.
- **Repeat safety**: each run issues a new password and the previous one stops working.
- **Outputs**: username `admin` and the new password. The password is shown only in this result and cannot be retrieved later; run the action again to get a new one.

## Tasks

**Set Admin Password** (critical)

- **What raises it**: `store.json` has no `adminPasswordHash`, which is the case on a fresh install.
- **Severity**: critical. AdGuard Home will not start until it is cleared.
- **What clears it**: running Set Admin Password. It does not return unless `store.json` loses the hash.

## Health Checks

The web check inspects a listening socket. The DNS check performs a real lookup through AdGuard Home.

| Check id                       | Probes                                                                                                  | Failure means                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adguard-home` (Web Interface) | TCP port 3000 listening                                                                                 | AdGuard Home has not started its web server. Check the service log for a config parse error or crash.                                                                                                                     |
| `dns` (DNS Server)             | `nslookup -type=a one.one.one.one 127.0.0.1:5300` in `adguard-home-sub`; every 60 s, 15 s while failing | AdGuard Home did not answer, or answered with an error. Usually its upstream servers are unreachable or misconfigured: use **Test upstreams** under Settings → DNS settings. Otherwise look for `bind` errors in the log. |

A blocked answer still passes: the check proves AdGuard Home answers, not that the name is allowed. With optimistic caching on, cached answers keep the check green through a short upstream outage. The lookups are hidden from the query log and statistics through their ignored lists; removing `one.one.one.one` from those lists, or turning the lists off, shows a lookup every minute from `127.0.0.1`.

## Backups and Restore

The `main` volume is copied as files (`ofVolumes`), excluding the query log (`work/data/querylog.json*`) and the downloaded blocklists (`work/data/filters/`). Backed up: the config, `store.json`, statistics (`stats.db`), and dashboard sessions.

A restored instance comes back with the same admin password, settings, and statistics, and an empty query log. AdGuard Home downloads its blocklists again as soon as it starts, which needs internet access.

## Limitations and Differences

1. **No DNS on port 53.** StartOS runs its own DNS server on port 53, and services cannot claim ports at or below 1024. Clients cannot use the StartOS address as an ordinary DNS server. Use the DoH interface, or the plain DNS port on 5300 from a client that accepts a custom port.
2. **DNS-over-TLS is not on port 853 by default.** StartOS assigns a high port. Android Private DNS works only with a public domain and a router forward from 853. AdGuard sees every DoT client as the StartOS proxy address, so `allowed_clients`, client IDs, and per-client settings can't tell DoT clients apart, and an exposed DoT address is open to anyone who knows the domain. AdGuard's per-IP rate limit applies only to UDP (tested: 60 parallel DoT queries from one address all answered, UDP cut off after 20), so DoT clients sharing one address are not throttled.
3. **No DNS-over-QUIC or DNSCrypt.** These need UDP or their own TLS handling, which the package does not set up.
4. **No DHCP server.** The container has no access to the LAN broadcast domain.
5. **Web and DNS listen addresses are fixed.** Edits to them in AdGuard's settings revert on the next start.
6. **Single admin account.** The `users` list is rewritten with the one `admin` user on every start.
7. **Client attribution.** AdGuard sees the address that sends it each query. Every device behind a forwarding resolver appears as that resolver: devices on a StartTunnel subnet whose DNS points here all appear as the subnet's `.1` address, and share AdGuard's limit of 20 UDP queries per second (`dns.ratelimit`) unless that address is in `dns.ratelimit_whitelist`. StartTunnel's resolver passes on no client information, so per-device rules and statistics are not possible on that path. DoT clients all appear as the StartOS proxy address.

---

## Quick Reference for AI Consumers

```yaml
package_id: adguard-home
image: adguard/adguardhome
architectures: [x86_64, aarch64]
subcontainers:
  - adguard-home-sub
volumes:
  main: /opt/adguardhome/conf (subpath conf), /opt/adguardhome/work (subpath work)
file_models:
  - main/conf/AdGuardHome.yaml
  - main/store.json
startos_managed_env_vars: []
dependencies: none
interfaces:
  ui: { type: ui, port: 3000 }
  doh: { type: api, port: 3000 }
  dot: { type: api, port: 5300, ssl_port_preferred: 853 }
  dns: { type: api, port: 5300, port_range: 2 }
actions:
  - set-admin-password
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - adguard-home
  - dns
```
