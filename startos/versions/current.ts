import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { adguardYaml } from '../fileModels/AdGuardHome.yaml'
import { healthCheckDomain } from '../utils'

export const current = VersionInfo.of({
  version: '0.107.79:1',
  releaseNotes: {
    en_US:
      'Fixes upstream DNS lookups on StartOS, adds a DNS health check that performs a real lookup, sets faster defaults on new installs, and makes backups smaller',
    es_ES:
      'Corrige las consultas DNS de subida en StartOS, añade una comprobación de salud DNS que realiza una consulta real, establece valores predeterminados más rápidos en nuevas instalaciones y reduce el tamaño de las copias de seguridad',
    de_DE:
      'Behebt Upstream-DNS-Abfragen unter StartOS, fügt eine DNS-Zustandsprüfung mit echter Abfrage hinzu, setzt schnellere Standardwerte bei Neuinstallationen und verkleinert Backups',
    pl_PL:
      'Naprawia zapytania do nadrzędnych serwerów DNS w StartOS, dodaje kontrolę stanu DNS wykonującą prawdziwe zapytanie, ustawia szybsze wartości domyślne w nowych instalacjach i zmniejsza kopie zapasowe',
    fr_FR:
      'Corrige les requêtes DNS en amont sur StartOS, ajoute une vérification de santé DNS qui effectue une vraie requête, définit des valeurs par défaut plus rapides pour les nouvelles installations et réduit la taille des sauvegardes',
  },
  migrations: {
    up: async ({ effects }) => {
      const conf = await adguardYaml.read().once()
      if (!conf) return
      const hideHealthCheck = (ignored: string[]) => ({
        ignored: [...new Set([...ignored, healthCheckDomain])],
        ignored_enabled: true,
      })
      await adguardYaml.merge(effects, {
        querylog: hideHealthCheck(conf.querylog.ignored),
        statistics: hideHealthCheck(conf.statistics.ignored),
      })
    },
    down: IMPOSSIBLE,
  },
})
