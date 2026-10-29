import { utils } from '@start9labs/start-sdk'
import bcrypt from 'bcryptjs'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { adminUsername } from '../utils'

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async ({ effects }) => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new random password for the AdGuard Home admin account. If AdGuard Home is running, it restarts to apply the new password.',
    ),
    warning: (await storeJson.read((s) => s.adminPasswordHash).const(effects))
      ? i18n(
          'This replaces the current admin password, and the old one stops working.',
        )
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 24,
    })
    await storeJson.merge(effects, {
      adminPasswordHash: bcrypt.hashSync(password, 10),
    })

    return {
      version: '1',
      title: i18n('AdGuard Home Admin Credentials'),
      message: i18n(
        'Use these credentials to sign in to the AdGuard Home web interface. The password is shown only now; run this action again to replace it.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: adminUsername,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
