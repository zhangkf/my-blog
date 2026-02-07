// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://kaifengzhang.com',
	integrations: [mdx(), sitemap()],
	// 禁用图片优化，避免构建失败
	image: {
		service: {
			entrypoint: 'astro/assets/services/noop',
		},
	},
});
