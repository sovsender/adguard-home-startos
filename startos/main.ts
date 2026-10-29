import { adguardYaml } from './fileModels/AdGuardHome.yaml'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { adminUsername, dnsPort, healthCheckDomain, uiPort } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting AdGuard Home!'))

  const passwordHash = await storeJson
    .read((s) => s.adminPasswordHash)
    .const(effects)
  // An empty users list would leave the dashboard open to anyone.
  if (!passwordHash) {
    throw new Error(
      'No admin password is set. Run the Set Admin Password action.',
    )
  }

  const osIp = await sdk.getOsIp(effects)
  await adguardYaml.merge(effects, {
    http: { address: `0.0.0.0:${uiPort}`, doh: { insecure_enabled: true } },
    users: [{ name: adminUsername, password: passwordHash }],
    dns: {
      bind_hosts: ['0.0.0.0'],
      port: dnsPort,
      trusted_proxies: ['127.0.0.0/8', '::1/128', `${osIp}/32`],
      // StartOS drops container DNS on port 53 to any other address.
      bootstrap_dns: [osIp],
    },
  })

  const adguardSub = sdk.SubContainer.of(
    effects,
    { imageId: 'adguard-home' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: 'conf',
        mountpoint: '/opt/adguardhome/conf',
        readonly: false,
      })
      .mountVolume({
        volumeId: 'main',
        subpath: 'work',
        mountpoint: '/opt/adguardhome/work',
        readonly: false,
      }),
    'adguard-home-sub',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('adguard-home', {
      subcontainer: adguardSub,
      exec: { command: sdk.useEntrypoint() },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
      },
      requires: [],
    })
    .addHealthCheck('dns', {
      ready: {
        display: i18n('DNS Server'),
        trigger: sdk.trigger.statusTrigger(60_000, {
          starting: 5_000,
          failure: 15_000,
        }),
        fn: () =>
          sdk.healthCheck.runHealthScript(
            ['nslookup', '-type=a', healthCheckDomain, `127.0.0.1:${dnsPort}`],
            adguardSub,
            {
              timeout: 20_000,
              errorMessage: i18n(
                'AdGuard Home is not resolving DNS queries. Check its upstream DNS servers.',
              ),
              message: () => i18n('AdGuard Home is resolving DNS queries'),
            },
          ),
      },
      requires: ['adguard-home'],
    })
})
