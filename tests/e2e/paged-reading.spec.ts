import { expect, type Page, test } from '@playwright/test';

const ARTICLE_CASES = [0, 1];

async function openLongArticle(page: Page, articleIndex: number) {
	await page.addInitScript(() => localStorage.setItem('haodu-paged', '0'));
	await page.goto('/');

	const paths = await page.locator('.article-list a').evaluateAll((links) =>
		links
			.map((link) => link.getAttribute('href'))
			.filter((href): href is string => Boolean(href)),
	);
	let longArticleIndex = 0;

	for (const path of paths) {
		const response = await page.goto(path);
		if (!response?.ok()) continue;

		const prose = page.locator('.prose');
		if (!(await prose.isVisible())) continue;
		const article = await prose.evaluate((element) => {
			const text = element.innerText.replace(/\s+/g, '');
			return {
				isLong: element.scrollHeight > window.innerHeight * 1.5,
				finalText: text.slice(-40),
			};
		});
		if (!article.isLong || article.finalText.length < 20) continue;

		if (longArticleIndex === articleIndex) {
			return { path, finalText: article.finalText };
		}
		longArticleIndex++;
	}

	throw new Error(`Only found ${longArticleIndex} long article(s); expected at least ${articleIndex + 1}`);
}

async function enablePagedModeIfNeeded(page: Page) {
	const body = page.locator('body');
	await expect(page.locator('#paged-toggle')).toBeVisible();
	if (!(await body.evaluate((element) => element.classList.contains('paged-mode')))) {
		await page.locator('#paged-toggle').click();
		await expect(body).toHaveClass(/paged-mode/);
	}
}

async function waitForPageCount(page: Page) {
	await expect
		.poll(async () => pageCountFromText(await page.locator('#page-info').textContent()))
		.toBeGreaterThan(1);
}

function pageCountFromText(text?: string | null) {
	const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
	return match ? Number(match[2]) : 0;
}

async function indicatedPageCount(page: Page) {
	return pageCountFromText(await page.locator('#page-info').textContent());
}

async function measuredContentPageCount(page: Page) {
	return page.locator('.prose').evaluate((prose) => {
		const proseRect = prose.getBoundingClientRect();
		const stride = prose.clientWidth;
		const savedLeft = prose.scrollLeft;
		const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
			},
		});
		let maxPage = 0;
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const rect of Array.from(range.getClientRects())) {
				if (rect.width <= 0 || rect.height <= 0) continue;
				const absLeft = rect.left - proseRect.left + savedLeft;
				if (absLeft < -1) continue;
				maxPage = Math.max(maxPage, Math.floor(Math.max(0, absLeft) / stride));
			}
			(range as Range & { detach?: () => void }).detach?.();
		}
		return maxPage + 1;
	});
}

async function goToLastPage(page: Page) {
	await waitForPageCount(page);
	const pageInfo = page.locator('#page-info');
	const total = await indicatedPageCount(page);
	for (let i = 1; i < total; i++) {
		await page.keyboard.press('ArrowRight');
	}
	await expect(pageInfo).toHaveText(`${total} / ${total}`);
	await page.waitForTimeout(350);
}

async function visibleTextSnapshot(page: Page) {
	return page.locator('.prose').evaluate((prose) => {
		const proseRect = prose.getBoundingClientRect();
		const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
			},
		});
		let visibleText = '';
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node.nodeValue || '';
			const range = document.createRange();
			for (let i = 0; i < text.length; i++) {
				if (/\s/.test(text.charAt(i))) continue;
				range.setStart(node, i);
				range.setEnd(node, i + 1);
				const visible = Array.from(range.getClientRects()).some(
					(rect) =>
						rect.right > proseRect.left + 8 &&
						rect.left < proseRect.right - 8 &&
						rect.bottom > proseRect.top + 8 &&
						rect.top < proseRect.bottom - 8,
				);
				if (visible) visibleText += text.charAt(i);
			}
			(range as Range & { detach?: () => void }).detach?.();
		}
		return visibleText;
	});
}

async function finalPageLayout(page: Page) {
	return page.locator('.prose').evaluate((prose) => {
		const proseRect = prose.getBoundingClientRect();
		const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
			},
		});
		let left = Number.POSITIVE_INFINITY;
		let right = Number.NEGATIVE_INFINITY;
		let lineCount = 0;
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const rect of Array.from(range.getClientRects())) {
				const visibleHorizontally = rect.right > proseRect.left + 8 && rect.left < proseRect.right - 8;
				const visibleVertically = rect.bottom > proseRect.top + 8 && rect.top < proseRect.bottom - 8;
				if (visibleHorizontally && visibleVertically) {
					left = Math.min(left, rect.left);
					right = Math.max(right, rect.right);
					lineCount++;
				}
			}
			(range as Range & { detach?: () => void }).detach?.();
		}
		return {
			lineCount,
			leftMargin: left - proseRect.left,
			rightMargin: proseRect.right - right,
		};
	});
}

for (const articleIndex of ARTICLE_CASES) {
	test(`mobile paged mode shows final text without blank or shifted last page: article ${articleIndex + 1}`, async ({ page }) => {
		const { finalText } = await openLongArticle(page, articleIndex);
		await enablePagedModeIfNeeded(page);
		await expect.poll(() => indicatedPageCount(page)).toBe(await measuredContentPageCount(page));
		await goToLastPage(page);

		await expect.poll(() => visibleTextSnapshot(page)).toContain(finalText.replace(/\s+/g, ''));

		const layout = await finalPageLayout(page);
		expect(layout.lineCount).toBeGreaterThan(0);
		expect(layout.leftMargin).toBeGreaterThan(8);
		expect(layout.leftMargin).toBeLessThan(40);
	});
}
