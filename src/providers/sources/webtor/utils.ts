import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://webtor.io';
export const apiUrl = 'https://api.webtor.io/v1';

export function buildSearchQuery(ctx: MovieScrapeContext | ShowScrapeContext): string {
  if (ctx.media.type === 'movie') {
    return `${ctx.media.title} ${ctx.media.releaseYear}`;
  }
  return `${ctx.media.title} S${ctx.media.season.number.toString().padStart(2, '0')}E${ctx.media.episode.number.toString().padStart(2, '0')}`;
}

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': baseUrl,
  'Referer': baseUrl
};

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  const tmdbId = ctx.media.tmdbId;
  const type = ctx.media.type;

  if (type === 'movie') {
    return `${apiUrl}/movies/${tmdbId}/magnet`;
  }

  if (type === 'show') {
    return `${apiUrl}/shows/${tmdbId}/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}/magnet`;
  }

  throw new Error('Invalid media type');
}

export function buildTorrentUrl(infoHash: string): string {
  return `${apiUrl}/torrents/${infoHash}`;
}

export function buildFileUrl(infoHash: string, filePath: string): string {
  return `${apiUrl}/torrents/${infoHash}/files/${encodeURIComponent(filePath)}`;
}

export function formatQuality(size?: string): string {
  if (!size) return 'unknown';
  const sizeInGB = parseFloat(size);
  if (sizeInGB > 4) return '1080p';
  if (sizeInGB > 2) return '720p';
  return '480p';
}
