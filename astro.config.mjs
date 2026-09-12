import { defineConfig } from 'astro/config';

const isCloudflare = process.env.CF_PAGES === '1';

const adapter = isCloudflare
  ? (await import('@astrojs/cloudflare')).default({
      platformProxy: {
        enabled: true,
      },
    })
  : (await import('@astrojs/node')).default({
      mode: 'standalone',
    });

export default defineConfig({
  output: 'server',
  adapter,
});
