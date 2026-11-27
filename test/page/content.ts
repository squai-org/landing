import { readFileSync } from 'node:fs';
import path from 'node:path';
import { serviceSchema, siteSchema } from '../../src/content/schema';

const contentDir = path.join(import.meta.dirname, '../../src/content');
const readJson = (file: string) => JSON.parse(readFileSync(path.join(contentDir, file), 'utf8'));

export const site = siteSchema.parse(readJson('copies.json').site);

export const service = (slug: string) => serviceSchema.parse(readJson(`services/${slug}.json`));

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export const decodeHtml = (html: string) =>
  html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? match;
    return String.fromCodePoint(code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  });
