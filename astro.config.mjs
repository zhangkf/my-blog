// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
// Force redeploy: 2026-02-07-
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://kaifengzhang.com',
	integrations: [mdx(), sitemap()],
});
