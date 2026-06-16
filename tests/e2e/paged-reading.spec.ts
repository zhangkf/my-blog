import { expect, type Page, test } from '@playwright/test';

const CASES = [
	{
		path: '/ai/satya-nadella/',
		finalText: '这就是公司如何为自己和更广泛的经济驱动价值的方式。这也是我们应该共同构建的稳定均衡状态。',
	},
	{
		path: '/health/article-byhil1/',
		finalText: '回顾你至今的人生，你甚至可能会得出结论：到目前为止，你其实处理得相当出色。',
	},
];

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

for (const { path, finalText } of CASES) {
	test(`mobile paged mode shows final text without blank or shifted last page: ${path}`, async ({ page }) => {
		await page.goto(path);
		await enablePagedModeIfNeeded(page);
		await expect.poll(() => indicatedPageCount(page)).toBe(await measuredContentPageCount(page));
		await goToLastPage(page);

		await expect.poll(() => visibleTextSnapshot(page)).toContain(finalText.replace(/\s+/g, ''));

		const layout = await finalPageLayout(page);
		expect(layout.lineCount).toBeGreaterThan(0);
		expect(Math.abs(layout.leftMargin - layout.rightMargin)).toBeLessThan(48);
	});
}
