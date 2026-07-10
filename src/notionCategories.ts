import manifest from './notion-categories.json';

export interface NotionCategory {
	dir: string;
	slug: string;
	published?: boolean;
}

export const categories = manifest as NotionCategory[];
export const publicCategories = categories.filter(({ published }) => published !== false);
