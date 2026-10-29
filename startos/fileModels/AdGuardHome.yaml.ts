import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { dnsPort, uiPort } from '../utils'

const dohShape = z.looseObject({
  insecure_enabled: z.literal(true).catch(true),
})

const httpShape = z.looseObject({
  address: z.literal(`0.0.0.0:${uiPort}`).catch(`0.0.0.0:${uiPort}`),
  doh: dohShape.catch(() => dohShape.parse({})),
})

const userShape = z.looseObject({
  name: z.string(),
  password: z.string(),
})

const dnsShape = z.looseObject({
  bind_hosts: z.array(z.string()).catch(['0.0.0.0']),
  port: z.literal(dnsPort).catch(dnsPort),
  trusted_proxies: z.array(z.string()).catch(['127.0.0.0/8', '::1/128']),
  bootstrap_dns: z.array(z.string()).catch([]),
})

const ignoredShape = z.looseObject({
  ignored: z.array(z.string()).catch([]),
  ignored_enabled: z.boolean().catch(false),
})

const shape = z.looseObject({
  http: httpShape.catch(() => httpShape.parse({})),
  users: z.array(userShape).catch([]),
  dns: dnsShape.catch(() => dnsShape.parse({})),
  querylog: ignoredShape.catch(() => ignoredShape.parse({})),
  statistics: ignoredShape.catch(() => ignoredShape.parse({})),
  // Seeds a fresh file only; AdGuard Home migrates and rewrites it itself.
  schema_version: z.number().catch(34),
})

export const adguardYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: 'conf/AdGuardHome.yaml' },
  shape,
)
