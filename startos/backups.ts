import { sdk } from './sdk'

// AdGuard Home re-downloads missing blocklists as soon as it starts.
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) =>
    sdk.Backups.ofVolumes('main').setOptions({
      exclude: ['/work/data/querylog.json*', '/work/data/filters/'],
    }),
)
