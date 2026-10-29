# AdGuard Home

StartOS keeps port 53 for its own DNS, so you can't enter this server's address as a normal DNS server on your router or devices. Use the **DNS-over-HTTPS** address, the **DNS-over-TLS** address (for Android), or the **Plain DNS** port from a router that accepts a custom DNS port.

## Documentation

- [AdGuard Home knowledge base](https://adguard-dns.io/kb/adguard-home/*) — upstream guides to settings, filtering, clients, and the FAQ.
- [AdGuard Home README](https://github.com/AdguardTeam/AdGuardHome/blob/master/README.md) — the upstream project overview and feature list.

## What you get on StartOS

- **Web Interface**: the AdGuard Home dashboard, where you manage blocklists, custom rules, upstream resolvers, clients, and the query log.
- **DNS-over-HTTPS**: an encrypted DNS address (it ends in `/dns-query`) that browsers and operating systems can use directly.
- **DNS-over-TLS**: encrypted DNS for Android's **Private DNS** setting and other DNS-over-TLS clients. Android needs extra setup; see below.
- **Plain DNS**: unencrypted DNS on port 5300 (UDP and TCP), for routers and resolvers that let you set a DNS port.
- The admin password is generated for you, and the first-run setup wizard is skipped.

## Getting set up

1. Run **Set Admin Password** when prompted. Copy the username and password it shows; the password is not shown again.
2. Start the service and open the **Web Interface**. Sign in with the credentials from step 1.
3. Copy the **DNS-over-HTTPS** address from the service's interfaces and add it to your clients:
   - **Firefox**: Settings → Privacy & Security → DNS over HTTPS → Max Protection → Custom.
   - **Chrome / Edge / Brave**: Settings → Privacy and security → Security → Use secure DNS → Add custom DNS service provider.
   - **Windows 11**: set the DNS server to any address, then choose **On (manual template)** for DNS over HTTPS and paste the address.
   - **iPhone, iPad, Mac**: install a DNS settings profile that uses the address (several free profile generators exist online).
4. Optional: if your router can forward DNS to a custom port (OpenWrt, pfSense, OPNsense and similar), point it at this server's LAN address on port **5300**. Every device on your network then gets filtering without any setup of its own.
5. Optional: set up Android Private DNS (next section).
6. Visit a few sites from a configured device, then check the dashboard's query log to confirm queries are arriving.

## Android Private DNS (DNS-over-TLS)

Android's **Private DNS** accepts only a hostname, always connects on port 853, and requires a publicly trusted certificate. StartOS doesn't let services use port 853 directly, so the **DNS-over-TLS** interface gets a different, high-numbered port. To make it work:

1. Add a public domain you own (for example `dns.example.com`) to the **DNS-over-TLS** interface in StartOS, so it gets a Let's Encrypt certificate. Let's Encrypt checks the domain on port 443, so that port must reach this server too.
2. Note the port StartOS shows for the domain address on the **DNS-over-TLS** interface.
3. Forward TCP port **853** to that port:
   - **StartTunnel**: in StartTunnel, add a published port with external port `853`, this server, and that port as the internal port.
   - **Home router**: forward TCP `853` from the internet to this server's LAN address on that port.
4. Point the domain's DNS record at the gateway's public IP address (the StartTunnel VPS, or your home's public IP).
5. On the phone: **Settings → Network & internet → Private DNS → Private DNS provider hostname**, and enter the domain.

With a home router, using it from your home Wi-Fi also needs NAT loopback (hairpin NAT). Most routers support it.

Private DNS fails with "Couldn't connect" while a VPN is on, including StartTunnel's WireGuard app. Turn the VPN off when you set it up.

**Warning:** anyone who knows the domain can use your server for DNS. AdGuard Home can't tell DNS-over-TLS clients apart (they all appear to come from StartOS), so **Settings → Access settings** and client IDs can't restrict this interface. Only forward port 853 if you accept that.

## Using it over a StartTunnel VPN

If your phone or laptop connects to StartTunnel with WireGuard, StartTunnel can send their DNS to AdGuard Home. WireGuard already encrypts it, so you don't need Private DNS while the VPN is on.

1. In StartTunnel, open **Subnets**, edit the subnet, set **DNS** to **Custom**, and enter this server's tunnel address with port 5300, for example `10.59.0.13:5300`. The **Device** option doesn't work here, because it always uses port 53.
2. In AdGuard Home, go to **Settings → DNS settings** and add the subnet's resolver address (the subnet's `.1`, for example `10.59.0.1`) to **Rate limiting allowlist**. All VPN devices reach AdGuard Home from that one address and would otherwise share a limit of 20 lookups per second.
3. If this server is on the same subnet, in StartOS go to **System → Gateways**, edit the StartTunnel gateway, and set **DNS** to **Static** (for example `1.1.1.1` and `9.9.9.9`). The server's own lookups then keep working while AdGuard Home is stopped or updating.
4. On the phone, set **Private DNS** to **Off** or **Automatic** while the VPN is on.

AdGuard Home shows all VPN devices as one client, the subnet's `.1` address. Name it under **Settings → Client settings**.

StartTunnel's VPN only carries traffic for the tunnel's own addresses. Android's **Block connections without VPN** therefore blocks every website; use **Always-on VPN** without it.

## If blocked sites still load

- **The browser uses its own secure DNS.** Firefox: **Settings → Privacy & Security → DNS over HTTPS → Off** (Default Protection can also switch it on). Chrome, Brave, Edge, and Vanadium: **Settings → Privacy and security → Use secure DNS → Off**. Or point the browser at this service's **DNS-over-HTTPS** address instead.
- **The browser has the site saved.** Open the site in a private window, or clear its cookies and site data.
- **The site loads from several domains.** Blocking `x.com` leaves `twimg.com` reachable, for example. Use **Filters → Blocked services**, which blocks all of a service's domains together.

## Using AdGuard Home

### Web interface

The dashboard opens to statistics for the last day. Blocklists live under **Filters → DNS blocklists**, your own rules under **Filters → Custom filtering rules**, and resolver choices under **Settings → DNS settings**.

A new install starts with Quad9 and Cloudflare as upstream servers, asked in parallel, with optimistic caching on and 7 days of query log and statistics. Change any of these in AdGuard Home's settings.

### Actions

- **Set Admin Password**: generates a new admin password and shows it once. Run it if you lose the password or want to change it. If AdGuard Home is running it restarts briefly, and the old password stops working.

## Limitations

- Settings under **Settings → Encryption** do nothing here. StartOS already handles encryption for the DNS-over-HTTPS and DNS-over-TLS addresses. DNS-over-QUIC and DNSCrypt are not available.
- DNS-over-TLS can't use port 853 without a router port forward.
- In the query log, DNS-over-TLS queries all show StartOS's internal address instead of the real device, and devices on a StartTunnel VPN all show the subnet's resolver address.
- Backups don't include the query log or the downloaded blocklists. After a restore, the blocklists download again as soon as AdGuard Home starts.
- The **Bootstrap DNS servers** setting resets to StartOS's own DNS server on every start. StartOS doesn't let services reach any other DNS server directly.
- The DHCP server is not available.
