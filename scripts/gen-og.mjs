#!/usr/bin/env node
/**
 * gen-og.mjs — 为每篇文章预生成 og:image 品牌卡
 *
 * 输出 public/og/<slug>.png，1200×630（og:image 标准尺寸）。
 * 视觉与 QuoteCard 同源：Kami 暖纸底 + 墨蓝大引号 + Noto Serif CJK SC 标题
 * + 左下「好读」落款 + 右下文章 QR。
 *
 * 实现：SVG 模板 + sharp 渲染。Node 端无 canvas/字体依赖，只要求系统
 * 安装 Noto Serif CJK SC（本地与 GitHub ubuntu runner 默认都有）。
 *
 * 运行：node scripts/gen-og.mjs
 * 构建前自动执行（见 package.json 的 build 脚本）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getContentRoute, parseFrontmatterValue } from './content-routing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content');
const MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'notion-categories.json');
const OG_DIR = path.join(REPO_ROOT, 'public', 'og');
const QR_DIR = path.join(REPO_ROOT, 'public', 'qr');

const W = 1200;
const H = 630;

/* Kami 色板（与 global.css :root 同步；og:image 通常展示在浅色上下文，固定浅色版） */
const P = {
	BG: '#f5f4ed',          // 暖纸底
	INK: '#1B365D',         // 墨蓝 accent
	TEXT: '#5c5443',        // --gray-dark
	MUTED: '#8a7e6b',       // --gray
};

/* ---------- 文本工具 ---------- */

function escapeXml(s) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/* 中文/混合文本折行。策略：
   - 把文本切成"原子"：每个 CJK 字/标点是一个原子；连续 ASCII 字母数字是一个原子（英文单词不断开）；空白单独是原子（可断点）。
   - 累加原子宽度（CJK=2, ASCII=1），超过 maxWidth 时在最近的空白处断开；找不到空白就在 CJK 边界硬断；绝不在英文单词内部断。 */
function wrapByDisplayWidth(text, maxWidth) {
	/* 1) 切原子 */
	const atoms = [];
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (/\s/.test(ch)) {
			atoms.push({ t: 'space', s: ch, w: 1 });
			i++;
		} else if (ch.codePointAt(0) > 0xff) {
			atoms.push({ t: 'cjk', s: ch, w: 2 });
			i++;
		} else {
			/* 连续 ASCII 字母数字为一个 word 原子 */
			let j = i;
			while (j < text.length
				&& text[j].codePointAt(0) <= 0xff
				&& !/\s/.test(text[j])) j++;
			const s = text.slice(i, j);
			atoms.push({ t: 'word', s, w: s.length });
			i = j;
		}
	}

	/* 2) 贪心累加 */
	const lines = [];
	let cur = '';
	let curW = 0;
	let lastSpaceAtomIdx = -1;   // cur 内最近一个 space 原子的下标
	const curAtoms = [];

	const pushLine = (lineStr) => {
		const trimmed = lineStr.replace(/\s+$/, '');
		if (trimmed) lines.push(trimmed);
	};

	for (const atom of atoms) {
		if (curW + atom.w > maxWidth && curAtoms.length > 0) {
			if (lastSpaceAtomIdx >= 0) {
				/* 在最近的空白断：head 入一行，tail + atom 起新行 */
				const head = curAtoms.slice(0, lastSpaceAtomIdx);
				const tail = curAtoms.slice(lastSpaceAtomIdx + 1);
				pushLine(head.map(a => a.s).join(''));
				curAtoms.length = 0;
				curAtoms.push(...tail, atom);
				cur = curAtoms.map(a => a.s).join('');
				curW = curAtoms.reduce((s, a) => s + a.w, 0);
			} else if (atom.t === 'word' && atom.w > maxWidth) {
				/* 单个英文单词本身就超一行宽度：罕见，硬塞当前行 */
				curAtoms.push(atom);
				cur += atom.s;
				curW += atom.w;
			} else {
				/* 没有空白可断：在 CJK 边界硬断（atom 是 cjk 或 word） */
				pushLine(cur);
				curAtoms.length = 0;
				curAtoms.push(atom);
				cur = atom.s;
				curW = atom.w;
			}
			/* 更新 lastSpaceAtomIdx 指向 curAtoms 中最近 space */
			lastSpaceAtomIdx = -1;
			for (let k = curAtoms.length - 1; k >= 0; k--) {
				if (curAtoms[k].t === 'space') { lastSpaceAtomIdx = k; break; }
			}
		} else {
			curAtoms.push(atom);
			cur += atom.s;
			curW += atom.w;
			if (atom.t === 'space') lastSpaceAtomIdx = curAtoms.length - 1;
		}
	}
	pushLine(cur);
	return lines;
}

/* 根据标题长度选初始字号，并折行。若折行后总行高超过安全区，
   按行数反推一个能放得下的字号。 */
function layoutTitle(title) {
	const len = title.length;
	let fontSize;
	let maxCJK;
	if (len <= 14)      { fontSize = 92; maxCJK = 11; }
	else if (len <= 22) { fontSize = 78; maxCJK = 13; }
	else if (len <= 32) { fontSize = 66; maxCJK = 15; }
	else if (len <= 48) { fontSize = 56; maxCJK = 17; }
	else                { fontSize = 48; maxCJK = 19; }

	/* 与 buildSvg 的安全区一致：safeTop=240, footTop=430 (H-200-30=400 for H=630).
	   预留 30px 上下缓冲，可用高度 ≈ 190px。 */
	const SAFE_H = 200;
	const LINE_RATIO = 1.5;

	let lines = wrapByDisplayWidth(title, maxCJK);
	let lineHeight = Math.round(fontSize * LINE_RATIO);
	/* 收缩字号直到放得下（最多 4 行，超过说明标题极长——直接用小字号） */
	while (lines.length * lineHeight > SAFE_H && fontSize > 40) {
		fontSize = Math.max(40, fontSize - 6);
		/* 字号小了，单行容量可以变大，重折行 */
		maxCJK = Math.min(maxCJK + 2, 22);
		lines = wrapByDisplayWidth(title, maxCJK);
		lineHeight = Math.round(fontSize * LINE_RATIO);
	}
	return { fontSize, lines, lineHeight };
}

/* ---------- SVG 模板 ---------- */

async function buildSvg({ title, categoryDir, qrPath }) {
	const { fontSize, lines, lineHeight } = layoutTitle(title);

	/* 布局常数 */
	const padX = 90;
	const qrSize = 160;
	const qrRight = W - padX;
	const qrLeft = qrRight - qrSize;
	const footTop = H - 200;            // 底部区分隔线 y
	const qrTop = footTop + 30;
	const qrBottom = qrTop + qrSize;
	const brandY = qrTop + qrSize / 2 + 18;   // 「好读」baseline 与 QR 视觉中心对齐

	/* 标题块垂直位置：顶部引号区 (~y=80-260) 和底部区 (footTop) 之间的中线 */
	const safeTop = 240;
	const safeBottom = footTop - 30;
	const blockH = lines.length * lineHeight;
	const startY = Math.round((safeTop + safeBottom) / 2 - blockH / 2 + fontSize * 0.4);

	/* QR 转 base64 嵌入 SVG */
	let qrData = '';
	try {
		const buf = fs.readFileSync(qrPath);
		qrData = `data:image/png;base64,${buf.toString('base64')}`;
	} catch { /* QR 缺失也照常出卡 */ }

	const titleSpans = lines.map((ln, i) =>
		`<text x="${padX}" y="${startY + i * lineHeight}" font-family="Noto Serif CJK SC, serif" font-size="${fontSize}" font-weight="500" fill="rgb(${hexToRgb(P.TEXT)})">${escapeXml(ln)}</text>`
	).join('\n    ');

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${W}" height="${H}" fill="${P.BG}"/>

  <!-- 顶部装饰大引号 -->
  <text x="${padX}" y="220" font-family="Georgia, 'Source Serif 4', serif" font-size="200" font-style="italic" fill="${P.INK}" opacity="0.16">“</text>

  <!-- 文章标题 -->
  ${titleSpans}

  <!-- 底部分隔线 -->
  <line x1="${padX}" y1="${footTop}" x2="${W - padX}" y2="${footTop}" stroke="${P.INK}" stroke-width="1.5" opacity="0.18"/>

  <!-- 左下落款：分类 + 品牌 -->
  <text x="${padX}" y="${footTop + 55}" font-family="Noto Serif CJK SC, serif" font-size="26" font-weight="400" fill="rgb(${hexToRgb(P.MUTED)})" letter-spacing="0.05em">${escapeXml(categoryDir)}</text>
  <text x="${padX}" y="${brandY}" font-family="Noto Serif CJK SC, serif" font-size="46" font-weight="700" fill="${P.INK}">「好读」</text>

  <!-- 右下 QR + 提示 -->
  ${qrData ? `<rect x="${qrLeft - 8}" y="${qrTop - 8}" width="${qrSize + 16}" height="${qrSize + 16}" fill="none" stroke="rgb(${hexToRgb(P.MUTED)})" stroke-width="1" opacity="0.25"/>
  <image x="${qrLeft}" y="${qrTop}" width="${qrSize}" height="${qrSize}" xlink:href="${qrData}"/>` : ''}
  <text x="${qrLeft + qrSize / 2}" y="${qrTop + qrSize + 28}" font-family="Noto Serif CJK SC, serif" font-size="18" font-weight="400" fill="rgb(${hexToRgb(P.MUTED)})" text-anchor="middle">扫码阅读全文</text>
</svg>`;
}

function hexToRgb(hex) {
	const m = hex.replace('#', '');
	const n = parseInt(m, 16);
	return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/* ---------- 主流程 ---------- */

let categories = [];
try {
	categories = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
} catch (err) {
	console.error('❌ 无法读取 src/notion-categories.json:', err.message);
	process.exit(1);
}

fs.mkdirSync(OG_DIR, { recursive: true });

let count = 0;
const errors = [];
const validFiles = new Set();

for (const { dir, slug: catSlug } of categories) {
	const catDir = path.join(CONTENT_DIR, dir);
	if (!fs.existsSync(catDir)) continue;
	const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.md'));
	for (const file of files) {
		const articleSlug = file.replace(/\.md$/, '');
		const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
		const route = getContentRoute(content, catSlug, articleSlug);
		const title = parseFrontmatterValue(content, 'title') || articleSlug;
		const qrPath = path.join(QR_DIR, `${route.slug}.png`);
		const outPath = path.join(OG_DIR, `${route.slug}.png`);
		try {
			const svg = await buildSvg({ title, categoryDir: dir, qrPath });
			/* density=72 → 1 user unit = 1 CSS px = 1 output pixel。
			   SVG width/height 已是 1200×630，渲染结果严格等于该尺寸。 */
			await sharp(Buffer.from(svg), { density: 72 })
				.resize(W, H, { fit: 'fill' })
				.png()
				.toFile(outPath);
			validFiles.add(`${route.slug}.png`);
			count++;
		} catch (err) {
			errors.push(`${route.category}/${route.slug}: ${err.message}`);
		}
	}
}

/* 清理孤儿 og 图（文章被移除） */
if (fs.existsSync(OG_DIR)) {
	for (const f of fs.readdirSync(OG_DIR).filter((x) => x.endsWith('.png'))) {
		if (!validFiles.has(f)) {
			fs.unlinkSync(path.join(OG_DIR, f));
			console.log(`🗑️  移除过期 og 图：${f}`);
		}
	}
}

if (errors.length) {
	console.error('⚠️  部分 og:image 生成失败：');
	for (const e of errors) console.error('   - ' + e);
}
console.log(`🖼️  生成 ${count} 个 og:image → public/og/`);
