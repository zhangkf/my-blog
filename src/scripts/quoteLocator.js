const VERSION = 'v1';
const ANCHOR_LENGTH = 12;
const MAX_QUOTE_LENGTH = 5000;
const MAX_TOKEN_LENGTH = 512;

function textNodes(root) {
	const nodes = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			return node.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
		},
	});
	let node;
	while ((node = walker.nextNode())) nodes.push(node);
	return nodes;
}

function fnv1a(text) {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}

function encodeAnchor(text) {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeAnchor(value) {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

function rangeOffsets(root, range) {
	const nodes = textNodes(root);
	let cursor = 0;
	let start = null;
	let end = null;

	for (const node of nodes) {
		const nodeStart = cursor;
		const nodeEnd = cursor + node.length;
		cursor = nodeEnd;

		let intersects = false;
		try {
			intersects = range.intersectsNode(node);
		} catch {
			intersects = false;
		}
		if (!intersects) continue;

		if (start === null) {
			start = node === range.startContainer
				? nodeStart + range.startOffset
				: nodeStart;
		}
		end = node === range.endContainer
			? nodeStart + range.endOffset
			: nodeEnd;
	}

	if (start === null || end === null || end <= start) return null;
	const raw = root.textContent.slice(start, end);
	const leading = raw.length - raw.trimStart().length;
	const trailing = raw.length - raw.trimEnd().length;
	return {
		start: start + leading,
		end: end - trailing,
	};
}

function sourceRange(source) {
	if (!source) return null;
	if (typeof source.cloneRange === 'function') return source.cloneRange();
	if (source.nodeType) {
		const range = document.createRange();
		range.selectNodeContents(source);
		return range;
	}
	return null;
}

function offsetsToRange(root, start, end) {
	const nodes = textNodes(root);
	let cursor = 0;
	let startNode = null;
	let startOffset = 0;
	let endNode = null;
	let endOffset = 0;

	for (const node of nodes) {
		const next = cursor + node.length;
		if (!startNode && start >= cursor && start < next) {
			startNode = node;
			startOffset = start - cursor;
		}
		if (endNode === null && end > cursor && end <= next) {
			endNode = node;
			endOffset = end - cursor;
			break;
		}
		cursor = next;
	}

	if (!startNode || !endNode) return null;
	const range = document.createRange();
	range.setStart(startNode, startOffset);
	range.setEnd(endNode, endOffset);
	return range;
}

export function createQuoteLocator(root, source, fallbackQuote) {
	const articleText = root && root.textContent;
	if (!articleText) return '';

	const range = sourceRange(source);
	let offsets = range && rangeOffsets(root, range);
	if (!offsets && fallbackQuote) {
		const start = articleText.indexOf(fallbackQuote);
		if (start >= 0) offsets = { start, end: start + fallbackQuote.length };
	}
	if (!offsets) return '';

	const quote = articleText.slice(offsets.start, offsets.end);
	if (quote.length < 2 || quote.length > MAX_QUOTE_LENGTH) return '';
	const anchor = quote.slice(0, ANCHOR_LENGTH) + '\0' + quote.slice(-ANCHOR_LENGTH);
	return [
		VERSION,
		offsets.start.toString(36),
		quote.length.toString(36),
		fnv1a(quote),
		encodeAnchor(anchor),
	].join('.');
}

export function resolveQuoteLocator(root, token) {
	if (!root || !token || token.length > MAX_TOKEN_LENGTH) return null;
	const parts = token.split('.');
	if (parts.length !== 5 || parts[0] !== VERSION) return null;

	const start = Number.parseInt(parts[1], 36);
	const length = Number.parseInt(parts[2], 36);
	if (!Number.isFinite(start) || !Number.isFinite(length)) return null;
	if (start < 0 || length < 2 || length > MAX_QUOTE_LENGTH) return null;

	const articleText = root.textContent || '';
	const direct = articleText.slice(start, start + length);
	if (direct.length === length && fnv1a(direct) === parts[3]) {
		return offsetsToRange(root, start, start + length);
	}

	let anchor;
	try {
		anchor = decodeAnchor(parts[4]);
	} catch {
		return null;
	}
	const separator = anchor.indexOf('\0');
	if (separator < 1) return null;
	const prefix = anchor.slice(0, separator);
	const suffix = anchor.slice(separator + 1);
	if (!prefix || !suffix) return null;

	let candidateStart = articleText.indexOf(prefix);
	while (candidateStart >= 0) {
		const expectedEnd = candidateStart + length;
		if (articleText.slice(Math.max(candidateStart, expectedEnd - suffix.length), expectedEnd) === suffix) {
			return offsetsToRange(root, candidateStart, expectedEnd);
		}

		const suffixStart = articleText.indexOf(suffix, candidateStart + prefix.length);
		if (suffixStart >= 0 && suffixStart - candidateStart <= length + 512) {
			return offsetsToRange(root, candidateStart, suffixStart + suffix.length);
		}
		candidateStart = articleText.indexOf(prefix, candidateStart + 1);
	}
	return null;
}

export function wrapQuoteRange(range) {
	const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
		? range.commonAncestorContainer
		: range.commonAncestorContainer.parentNode;
	if (!root) return [];

	const segments = [];
	for (const node of textNodes(root)) {
		let intersects = false;
		try {
			intersects = range.intersectsNode(node);
		} catch {
			intersects = false;
		}
		if (!intersects) continue;

		const start = node === range.startContainer ? range.startOffset : 0;
		const end = node === range.endContainer ? range.endOffset : node.length;
		if (end > start) segments.push({ node, start, end });
	}

	const marks = [];
	for (let i = segments.length - 1; i >= 0; i--) {
		const { node, start, end } = segments[i];
		const selected = node.splitText(start);
		selected.splitText(end - start);
		const mark = document.createElement('span');
		mark.className = 'haodu-return-quote';
		selected.parentNode.insertBefore(mark, selected);
		mark.appendChild(selected);
		marks.unshift(mark);
	}
	return marks;
}
