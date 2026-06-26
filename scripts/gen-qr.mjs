#!/usr/bin/env node
/**
 * gen-qr.mjs — 为每篇文章预生成二维码 PNG
 *
 * 读取 src/notion-categories.json，遍历每个分类目录下的 .md 文件，
 * 文件名（去扩展名）即文章 slug。二维码内容 = 文章完整 URL，
 * 输出到 public/qr/{slug}.png。供金句卡片 Canvas drawImage 使用。
 *
 * 运行：node scripts/gen-qr.mjs
 * 构建前自动执行（见 package.json 的 build 脚本）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content');
const MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'notion-categories.json');
const QR_DIR = path.join(REPO_ROOT, 'public', 'qr');

const SITE = 'https://haodu.kaifengzhang.com';

/* 读取分类清单 */
let categories = [];
try {
	categories = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
} catch (err) {
	console.error('❌ 无法读取 src/notion-categories.json:', err.message);
	process.exit(1);
}

fs.mkdirSync(QR_DIR, { recursive: true });

/* QR 绘制参数（与卡片 Canvas 里的 QR 区块尺寸匹配：约 220px @ 1080 卡） */
const QR_OPTS = {
	errorCorrectionLevel: 'M',
	margin: 1,            /* 留 1 个模块白边，卡片里再画外框 */
	width: 440,           /* 2x 卡片显示尺寸，保证清晰 */
	color: { dark: '#1B365D', light: '#00000000' }, /* 墨蓝模块、透明底 */
};

let count = 0;
const errors = [];

for (const { dir, slug: catSlug } of categories) {
	const catDir = path.join(CONTENT_DIR, dir);
	if (!fs.existsSync(catDir)) {
		console.warn(`⚠️  分类目录不存在，跳过：${dir}`);
		continue;
	}
	const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.md'));
	for (const file of files) {
		const articleSlug = file.replace(/\.md$/, '');
		const url = `${SITE}/${catSlug}/${articleSlug}/`;
		const outPath = path.join(QR_DIR, `${articleSlug}.png`);
		try {
			await QRCode.toFile(outPath, url, QR_OPTS);
			count++;
		} catch (err) {
			errors.push(`${catSlug}/${articleSlug}: ${err.message}`);
		}
	}
}

/* 清理孤儿：删除 QR 目录里不再对应任何文章的 png（例如文章被 Notion 移除） */
const validSlugs = new Set();
for (const { dir } of categories) {
	const catDir = path.join(CONTENT_DIR, dir);
	if (!fs.existsSync(catDir)) continue;
	for (const f of fs.readdirSync(catDir).filter((x) => x.endsWith('.md'))) {
		validSlugs.add(f.replace(/\.md$/, '') + '.png');
	}
}
if (fs.existsSync(QR_DIR)) {
	for (const f of fs.readdirSync(QR_DIR).filter((x) => x.endsWith('.png'))) {
		if (!validSlugs.has(f)) {
			fs.unlinkSync(path.join(QR_DIR, f));
			console.log(`🗑️  移除过期 QR：${f}`);
		}
	}
}

if (errors.length) {
	console.error('⚠️  部分二维码生成失败：');
	for (const e of errors) console.error('   - ' + e);
}
console.log(`✨ 生成 ${count} 个二维码 → public/qr/`);
