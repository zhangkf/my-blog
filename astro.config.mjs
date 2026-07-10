// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { getContentRoute } from './scripts/content-routing.mjs';

const site = 'https://haodu.kaifengzhang.com';
const archivedPaths = new Set();
const categories = JSON.parse(fs.readFileSync('./src/notion-categories.json', 'utf-8'));
for (const { dir, slug: categorySlug, published } of categories) {
	if (published !== false) continue;
	const categoryPath = path.join('./src/content', dir);
	if (!fs.existsSync(categoryPath)) continue;
	for (const filename of fs.readdirSync(categoryPath).filter((name) => name.endsWith('.md'))) {
		const content = fs.readFileSync(path.join(categoryPath, filename), 'utf-8');
		const route = getContentRoute(content, categorySlug, filename.replace(/\.md$/, ''));
		archivedPaths.add(`/${route.category}/${route.slug}/`);
	}
}

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [
		mdx(),
		sitemap({
			filter: (page) => !archivedPaths.has(decodeURIComponent(new URL(page).pathname)),
		}),
	],
	// 禁用图片优化，避免构建失败
	image: {
		service: {
			entrypoint: 'astro/assets/services/noop',
		},
	},
});
