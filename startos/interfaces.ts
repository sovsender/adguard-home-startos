import { i18n } from './i18n'
import { sdk } from './sdk'
import { dnsPort, dotPort, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const webOrigin = await sdk.MultiHost.of(effects, 'web').bindPort(uiPort, {
    protocol: 'http',
  })

  const ui = sdk.createInterface(effects, {
    name: i18n('Web Interface'),
    id: 'ui',
    description: i18n('The AdGuard Home dashboard and settings'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const doh = sdk.createInterface(effects, {
    name: i18n('DNS-over-HTTPS'),
    id: 'doh',
    description: i18n(
      'Encrypted DNS endpoint for browsers and operating systems that support DNS-over-HTTPS',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/dns-query',
    query: {},
  })

  const webReceipt = await webOrigin.export([ui, doh])

  // UDP is only bindable as a range of at least two ports; the second is unused.
  const dnsRange = await sdk.MultiHost.of(effects, 'dns').bindPortRange({
    internalStartPort: dnsPort,
    externalStartPort: dnsPort,
    numberOfPorts: 2,
  })
  await dnsRange.export(
    sdk.createRangeInterface(effects, {
      id: 'dns',
      name: i18n('Plain DNS'),
      description: i18n(
        'Unencrypted DNS over UDP and TCP on the first port of this range, for routers and resolvers that accept a custom DNS port',
      ),
    }),
  )

  // StartOS terminates TLS and forwards AdGuard's plain TCP DNS listener.
  const dotOrigin = await sdk.MultiHost.of(effects, 'dot').bindPort(dnsPort, {
    protocol: null,
    secure: null,
    preferredExternalPort: dnsPort,
    addSsl: { preferredExternalPort: dotPort, alpn: null },
  })
  const dotReceipt = await dotOrigin.export([
    sdk.createInterface(effects, {
      name: i18n('DNS-over-TLS'),
      id: 'dot',
      description: i18n(
        'Encrypted DNS for Android Private DNS and other DNS-over-TLS clients',
      ),
      type: 'api',
      masked: false,
      schemeOverride: null,
      username: null,
      path: '',
      query: {},
    }),
  ])

  return [webReceipt, dotReceipt]
})
