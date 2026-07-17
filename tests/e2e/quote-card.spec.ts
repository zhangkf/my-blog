import { expect, test } from '@playwright/test';

test('复制文字包含清晰排版、文章标题和原文链接', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async (text: string) => {
					(window as typeof window & { __copiedText?: string }).__copiedText = text;
				},
			},
		});
	});

	await page.goto('/');
	const articlePath = await page.locator('.article-list a').first().getAttribute('href');
	expect(articlePath).toBeTruthy();
	await page.goto(articlePath!);

	const title = (await page.locator('.article-header h1').textContent())?.trim();
	const canonicalURL = await page.locator('link[rel="canonical"]').getAttribute('href');
	const quote = '值得分享的一句话';

	await page.evaluate((text) => {
		document.dispatchEvent(new CustomEvent('haodu:quote', { detail: { quote: text } }));
	}, quote);
	await page.locator('#qc-copy').click();

	const copiedText = await page.evaluate(
		() => (window as typeof window & { __copiedText?: string }).__copiedText,
	);
	expect(copiedText).toBe(
		`「${quote}」\n\n《${title}》\n来自「好读」· 慢一点，读好一点\n${canonicalURL}`,
	);
	expect(copiedText?.endsWith(canonicalURL!)).toBe(true);
	await expect(page.locator('#qc-tip')).toHaveText('已复制文字');
});
