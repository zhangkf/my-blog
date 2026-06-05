import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import categories from '../notion-categories.json';

export async function GET(context) {
	const allPosts = [];
	for (const { slug } of categories) {
		const posts = await getCollection(slug);
		for (const post of posts) {
			allPosts.push({
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.pubDate,
				link: `/${slug}/${post.id}/`,
			});
		}
	}
	allPosts.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: allPosts,
	});
}
