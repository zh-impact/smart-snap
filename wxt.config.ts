import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDirTemplate: '{{browser}}-mv{{manifestVersion}}{{modeSuffix}}',
  manifest: {
    name: 'Smart Snap',
    short_name: 'Smart Snap',
    description: 'Capture selected web page elements into composed screenshots.',
    action: {
      default_title: 'Smart Snap',
    },
    permissions: ['activeTab', 'downloads', 'sidePanel', 'storage'],
    commands: {
      'start-element-selection': {
        suggested_key: {
          default: 'Alt+Shift+C',
        },
        description: 'Select elements on the current page',
      },
    },
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.mode !== 'development') return;
      manifest.name = `${manifest.name} (DEV)`;
      if (manifest.short_name) manifest.short_name = `${manifest.short_name} (DEV)`;
      if (manifest.action) {
        manifest.action.default_title = `${manifest.action.default_title ?? 'Smart Snap'} (DEV)`;
      }
    },
  },
});
