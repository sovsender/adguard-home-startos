import { adguardYaml } from '../fileModels/AdGuardHome.yaml'
import { sdk } from '../sdk'
import { healthCheckDomain } from '../utils'

export const seedConfig = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  const osIp = await sdk.getOsIp(effects)
  const ignored = { ignored: [healthCheckDomain], ignored_enabled: true }
  await adguardYaml.merge(effects, {
    dns: {
      upstream_dns: ['https://9.9.9.10/dns-query', 'https://1.1.1.1/dns-query'],
      upstream_mode: 'parallel',
      fallback_dns: [osIp],
      cache_optimistic: true,
    },
    querylog: { interval: '7d', ...ignored },
    statistics: { interval: '7d', ...ignored },
  })
})
