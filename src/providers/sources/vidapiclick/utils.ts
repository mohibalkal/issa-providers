import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://vidapiclick.com';

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty'
};

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  const baseApiUrl = `${baseUrl}/api/source`;
  const tmdbId = ctx.media.tmdbId;

  if (ctx.media.type === 'movie') {
    return `${baseApiUrl}/movie/${tmdbId}`;
  }

  if (ctx.media.type === 'show') {
    return `${baseApiUrl}/tv/${tmdbId}/${ctx.media.season.number}/${ctx.media.episode.number}`;
  }

  throw new Error('Invalid media type');
}
