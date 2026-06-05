import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'node:fs';

// Schema shared by all Notion-synced collections
const notionSchema = ({ image }: { image: Function }) =>
	z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: image().or(z.string().url()).optional(),
		category: z.string().optional(),
		source: z.string().optional(),
		notion_id: z.string().optional(),
		notion_parent: z.string().optional(),
		last_synced: z.string().optional(),
	});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: notionSchema,
});

const readings = defineCollection({
	loader: glob({ base: './src/content/readings', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().or(z.string().url()).optional(),
			source: z.string().optional(),
			translator: z.string().optional(),
		}),
});

// Dynamically register Notion category collections
const notionCategories: Record<string, ReturnType<typeof defineCollection>> = {};
try {
	const manifest = JSON.parse(
		fs.readFileSync('./src/notion-categories.json', 'utf-8')
	) as { dir: string; slug: string }[];
	for (const { dir, slug } of manifest) {
		notionCategories[slug] = defineCollection({
			loader: glob({ base: `./src/content/${dir}`, pattern: '**/*.{md,mdx}' }),
			schema: notionSchema,
		});
	}
} catch {
	// No manifest yet – skip
}

export const collections = { blog, readings, ...notionCategories };
