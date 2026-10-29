import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'adguard-home',
  title: 'AdGuard Home',
  license: 'GPL-3.0',
  packageRepo: 'https://github.com/Reformer3322/adguard-home-startos',
  upstreamRepo: 'https://github.com/AdguardTeam/AdGuardHome',
  marketingUrl: 'https://adguard.com/adguard-home/overview.html',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    'adguard-home': {
      source: { dockerTag: 'adguard/adguardhome:v0.107.79' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
