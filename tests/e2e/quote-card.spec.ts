import { expect, test } from '@playwright/test';

async function firstArticlePath(page: import('@playwright/test').Page) {
	await page.goto('/');
	const articlePath = await page.locator('.article-list a').first().getAttribute('href');
	expect(articlePath).toBeTruthy();
	return articlePath!;
}

async function openLongArticle(page: import('@playwright/test').Page) {
	await page.goto('/');
	const paths = await page.locator('.article-list a').evaluateAll((links) =>
		links
			.map((link) => link.getAttribute('href'))
			.filter((href): href is string => Boolean(href)),
	);

	for (const path of paths) {
		await page.goto(path);
		const pageInfo = page.locator('#page-info');
		const isLong = await expect
			.poll(async () => {
				const text = await pageInfo.textContent();
				return Number(text?.match(/\/\s*(\d+)/)?.[1] || 0);
			})
			.toBeGreaterThan(1)
			.then(() => true)
			.catch(() => false);
		if (isLong) return path;
	}
	throw new Error('No paginated article found');
}

async function makeCrossPageQuoteLink(page: import('@playwright/test').Page) {
	const result = await page.locator('.prose').evaluate((prose) => {
		const rootRect = prose.getBoundingClientRect();
		const stride = prose.clientWidth;
		const savedLeft = prose.scrollLeft;
		const nodes: Text[] = [];
		const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
			},
		});
		let node: Node | null;
		while ((node = walker.nextNode())) nodes.push(node as Text);

		const pagesForRange = (range: Range) =>
			Array.from(range.getClientRects())
				.filter((rect) => rect.width > 0 && rect.height > 0)
				.map((rect) =>
					Math.floor(Math.max(0, rect.left - rootRect.left + savedLeft) / stride),
				);

		let source: Range | undefined;
		for (const textNode of nodes) {
			const range = document.createRange();
			range.selectNodeContents(textNode);
			if (new Set(pagesForRange(range)).size > 1) {
				source = range;
				break;
			}
		}

		if (!source) {
			for (let i = 0; i < nodes.length - 1; i++) {
				const first = document.createRange();
				first.selectNodeContents(nodes[i]);
				const second = document.createRange();
				second.selectNodeContents(nodes[i + 1]);
				const firstPages = pagesForRange(first);
				const secondPages = pagesForRange(second);
				if (!firstPages.length || !secondPages.length) continue;
				if (firstPages.at(-1) === secondPages[0]) continue;
				source = document.createRange();
				source.setStart(nodes[i], Math.max(0, nodes[i].length - 12));
				source.setEnd(nodes[i + 1], Math.min(12, nodes[i + 1].length));
				break;
			}
		}

		if (!source) throw new Error('No cross-page text range found');
		const pages = pagesForRange(source);
		const quote = source.toString().trim();
		document.dispatchEvent(
			new CustomEvent('haodu:quote', {
				detail: { quote, source: source.cloneRange() },
			}),
		);
		return { quote, expectedPage: pages[0] + 1 };
	});

	const overlay = page.locator('#qc-overlay');
	await expect(overlay).toHaveAttribute('data-quote-url', /#q=v1\./);
	await expect(overlay).toHaveAttribute('data-qr-url', /#q=v1\./);
	expect(await overlay.getAttribute('data-qr-url')).toBe(
		await overlay.getAttribute('data-quote-url'),
	);
	const quoteURL = new URL((await overlay.getAttribute('data-quote-url'))!);
	return {
		...result,
		url: new URL(`${quoteURL.pathname}${quoteURL.hash}`, page.url()).href,
	};
}

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

	const articlePath = await firstArticlePath(page);
	await page.goto(articlePath);

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

test('二维码深链在分页模式定位并高亮跨页金句', async ({ page }) => {
	await openLongArticle(page);
	const { url, quote, expectedPage } = await makeCrossPageQuoteLink(page);

	await page.goto('/');
	await page.goto(url);
	await expect(page.locator('body')).toHaveClass(/paged-mode/);
	await expect(page.locator('.haodu-return-quote')).not.toHaveCount(0);
	await expect(page.locator('.haodu-return-quote.is-active')).not.toHaveCount(0);
	await expect(page.locator('#page-info')).toHaveText(
		new RegExp(`^${expectedPage}\\s*/\\s*\\d+$`),
	);

	const reveal = await page.locator('.prose').evaluate((prose) => {
		const rootRect = prose.getBoundingClientRect();
		const savedLeft = prose.scrollLeft;
		const stride = prose.clientWidth;
		const marks = Array.from(prose.querySelectorAll('.haodu-return-quote'));
		const pageIndexes = marks.flatMap((mark) =>
			Array.from(mark.getClientRects())
				.filter((rect) => rect.width > 0 && rect.height > 0)
				.map((rect) =>
					Math.floor(Math.max(0, rect.left - rootRect.left + savedLeft) / stride),
				),
		);
		return {
			pageCount: new Set(pageIndexes).size,
			text: marks.map((mark) => mark.textContent).join(''),
		};
	});
	expect(reveal.pageCount).toBeGreaterThan(1);
	expect(quote).toContain(reveal.text.trim());
});

test('滚动模式定位金句，无效定位器安全降级', async ({ page }) => {
	await openLongArticle(page);
	const { url } = await makeCrossPageQuoteLink(page);
	await page.evaluate(() => localStorage.setItem('haodu-paged', '0'));

	await page.goto('/');
	await page.goto(url);
	await expect(page.locator('body')).not.toHaveClass(/paged-mode/);
	const target = page.locator('.haodu-return-quote').first();
	await expect(target).toBeInViewport();
	await expect(target).toHaveClass(/is-active/);

	const articleURL = new URL(url);
	await page.goto('/');
	await page.goto(`${articleURL.origin}${articleURL.pathname}#q=invalid`);
	await expect(page.locator('.article-header h1')).toBeVisible();
	await expect(page.locator('.haodu-return-quote')).toHaveCount(0);
});

test('跨出正文的选区不会生成金句卡入口', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('haodu-paged', '0'));
	const articlePath = await firstArticlePath(page);
	await page.goto(articlePath);

	await page.evaluate(() => {
		const text = document.querySelector('.prose p')?.firstChild;
		if (!text || text.nodeType !== Node.TEXT_NODE) throw new Error('Article text not found');
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, Math.min(20, text.nodeValue?.length || 0));
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	});
	await expect(page.locator('#qc-bubble')).toBeVisible();

	await page.evaluate(() => {
		const selection = window.getSelection();
		const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
		const footerText = document.querySelector('footer')?.firstChild;
		if (!range || !footerText) throw new Error('Cross-boundary target not found');
		range.setEndAfter(footerText);
		selection?.removeAllRanges();
		selection?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	});
	await expect(page.locator('#qc-bubble')).toBeHidden();
});

test('分页定位容忍微信 WebView 的目标坐标左偏', async ({ page }) => {
	await openLongArticle(page);
	const pageInfo = page.locator('#page-info');
	const total = Number((await pageInfo.textContent())?.match(/\/\s*(\d+)/)?.[1]);
	const expectedPage = Math.min(5, total);
	const pageTargets = [await page.locator('.prose').evaluate((prose) => prose.scrollLeft)];

	for (let current = 2; current <= expectedPage; current++) {
		await page.keyboard.press('ArrowRight');
		await expect(pageInfo).toHaveText(`${current} / ${total}`);
		await page.waitForTimeout(320);
		pageTargets.push(await page.locator('.prose').evaluate((prose) => prose.scrollLeft));
	}
	for (let current = expectedPage - 1; current >= 1; current--) {
		await page.keyboard.press('ArrowLeft');
		await expect(pageInfo).toHaveText(`${current} / ${total}`);
	}
	await page.waitForTimeout(320);

	await page.locator('.prose').evaluate((prose, targetLeft) => {
		const proseRect = prose.getBoundingClientRect();
		const syntheticTarget = {
			getClientRects() {
				return [{
					left: proseRect.left + targetLeft - prose.scrollLeft - 1,
					right: proseRect.left + targetLeft - prose.scrollLeft + 20,
					top: proseRect.top + 20,
					bottom: proseRect.top + 40,
					width: 20,
					height: 20,
					x: proseRect.left + targetLeft - prose.scrollLeft - 1,
					y: proseRect.top + 20,
					toJSON() {},
				}];
			},
		};
		document.dispatchEvent(new CustomEvent('haodu:reveal-quote', {
			detail: { elements: [syntheticTarget] },
		}));
	}, pageTargets.at(-1)!);

	await expect(pageInfo).toHaveText(`${expectedPage} / ${total}`);
});
