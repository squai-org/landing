export type FaqBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export function parseFaqParagraph(paragraph: string): FaqBlock {
  const lines = paragraph
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0 && lines.every((line) => line.startsWith('- '))) {
    return {
      type: 'list',
      items: lines.map((line) => line.slice(2).trim()),
    };
  }

  return {
    type: 'paragraph',
    text: paragraph,
  };
}
