import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl, youtubeVideoId } from '../../src/lib/youtube';

const id = 'dQw4w9WgXcQ';

describe('youtubeVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://www.youtube.com/watch?list=PL1&v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  ])('extrae el id de %s', (url) => {
    expect(youtubeVideoId(url)).toBe(id);
  });

  it.each([
    '',
    'no es una url',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ"onload="x',
    'https://www.youtube.com/watch',
    'https://youtu.be/',
    'https://www.youtube.com/channel/UC1234567890',
  ])('rechaza %s', (url) => {
    expect(youtubeVideoId(url)).toBeUndefined();
  });
});

describe('youtubeEmbedUrl', () => {
  it('apunta al dominio de privacidad mejorada con reproduccion automatica', () => {
    expect(youtubeEmbedUrl(id)).toBe(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`);
  });
});
