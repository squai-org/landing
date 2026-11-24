const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const EMBED_HOSTS = new Set([...WATCH_HOSTS, 'www.youtube-nocookie.com']);
const SHORT_HOST = 'youtu.be';

const validId = (candidate: string | null | undefined) => (candidate && VIDEO_ID.test(candidate) ? candidate : undefined);

export function youtubeVideoId(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:') return undefined;

  if (url.hostname === SHORT_HOST) return validId(url.pathname.slice(1));
  if (WATCH_HOSTS.has(url.hostname) && url.pathname === '/watch') return validId(url.searchParams.get('v'));
  if (EMBED_HOSTS.has(url.hostname) && url.pathname.startsWith('/embed/')) return validId(url.pathname.slice('/embed/'.length));
  return undefined;
}

export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
