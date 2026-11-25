import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFaqParagraph } from './faq';

test('parseFaqParagraph returns paragraph block for plain prose', () => {
  assert.deepEqual(parseFaqParagraph('Todas las sesiones quedan grabadas.'), {
    type: 'paragraph',
    text: 'Todas las sesiones quedan grabadas.',
  });
});

test('parseFaqParagraph returns list block when every line starts with dash bullet', () => {
  const input = [
    '- México (Ciudad de México): de 5:30 a 8:00 p. m.',
    '- Perú y Ecuador: de 6:30 a 9:00 p. m.',
  ].join('\n');

  assert.deepEqual(parseFaqParagraph(input), {
    type: 'list',
    items: [
      'México (Ciudad de México): de 5:30 a 8:00 p. m.',
      'Perú y Ecuador: de 6:30 a 9:00 p. m.',
    ],
  });
});

test('parseFaqParagraph keeps mixed lines as paragraph', () => {
  assert.deepEqual(parseFaqParagraph('Intro:\n- Item 1'), {
    type: 'paragraph',
    text: 'Intro:\n- Item 1',
  });
});
