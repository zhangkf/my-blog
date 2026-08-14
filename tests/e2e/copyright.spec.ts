import { expect, test } from '@playwright/test';

test('页脚和关于页展示全站版权声明', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('footer')).toContainText('多数文章为中文整理译文，版权归原作者');

	await page.goto('/about/');
	await expect(page.locator('main')).toContainText('文末会标明原作者、原名和原文链接');
});

test('有出处的文章渲染统一版权栏，并隐藏原文末 callout', async ({ page }) => {
	await page.goto('/health/article-bmhhcz/');

	const bar = page.locator('.haodu-copyright');
	await expect(bar).toBeVisible();
	await expect(bar).toContainText('How to Exist');
	await expect(bar).toContainText('David Cain');
	await expect(bar.getByRole('link', { name: '阅读原文' })).toHaveAttribute(
		'href',
		'https://www.raptitude.com/2026/07/how-to-exist/',
	);
	await expect(bar).toContainText('中文由好读整理，版权归原作者');

	const leftover = page.locator('blockquote', { hasText: '出处' });
	await expect(leftover).toHaveCount(0);
});

test('没有出处的文章不显示版权栏', async ({ page }) => {
	await page.goto('/os/ai-native/');
	await expect(page.locator('.haodu-copyright')).toBeHidden();
});
