import { Caption } from '@/providers/captions';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { InsertUnitResponse, Season } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { Stream } from '@/providers/streams';
import { SourcererOutput } from '@/providers/base';

import { getCaptions } from './captions';

export const insertUnitBase = 'https://insertunit.com/';

async function parseShowData(data: string): Promise<Season[]> {
  console.log('[InsertUnit] Parsing show data');
  const seasonDataJSONregex = /seasons\s*:\s*(\[[^\]]*\])/;
  const seasonData = seasonDataJSONregex.exec(data);

  if (!seasonData?.[1]) {
    console.error('[InsertUnit] No seasons data found in response');
    throw new NotFoundError('No seasons data found');
  }

  try {
    const seasons = JSON.parse(seasonData[1].replace(/'/g, '"')) as Season[];
    console.log(`[InsertUnit] Found ${seasons.length} seasons`);
    return seasons;
  } catch (error) {
    console.error('[InsertUnit] Error parsing seasons data:', error);
    throw new NotFoundError('Invalid seasons data');
  }
}

async function parseMovieData(data: string): Promise<{ stream: string; captions: Caption[] }> {
  console.log('[InsertUnit] Parsing movie data');
  const streamRegex = /hls\s*:\s*"([^"]*)"/;
  const streamData = streamRegex.exec(data);

  if (!streamData?.[1]) {
    console.error('[InsertUnit] No stream data found in response');
    throw new NotFoundError('No stream data found');
  }

  const subtitleRegex = /cc\s*:\s*(\[[^\]]*\])/;
  const subtitleJSONData = subtitleRegex.exec(data);

  let captions: Caption[] = [];

  if (subtitleJSONData?.[1]) {
    try {
      const subtitleData = JSON.parse(subtitleJSONData[1].replace(/'/g, '"'));
      captions = await getCaptions(subtitleData);
      console.log(`[InsertUnit] Found ${captions.length} captions`);
    } catch (error) {
      console.warn('[InsertUnit] Failed to parse captions:', error);
    }
  }

  return {
    stream: streamData[1],
    captions,
  };
}

export async function scrapeInsertUnitShow(ctx: ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[InsertUnit] Starting show scraping for TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const playerData = await ctx.proxiedFetcher<string>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl
      }
    });
    ctx.progress(30);

    const seasonTable = await parseShowData(playerData);
    ctx.progress(60);

    const currentSeason = seasonTable.find(
      (seasonElement) => seasonElement.season === ctx.media.season.number && !seasonElement.blocked,
    );

    if (!currentSeason) {
      console.error('[InsertUnit] Season not found or blocked');
      throw new NotFoundError('Season not found');
    }

    const currentEpisode = currentSeason.episodes.find((episodeElement) =>
      episodeElement.episode === ctx.media.episode.number.toString(),
    );

    if (!currentEpisode?.hls) {
      console.error('[InsertUnit] Episode not found or no HLS stream available');
      throw new NotFoundError('Episode not found');
    }

    let captions: Caption[] = [];
    if (currentEpisode.cc) {
      try {
        captions = await getCaptions(currentEpisode.cc);
        console.log(`[InsertUnit] Found ${captions.length} captions for episode`);
      } catch (error) {
        console.warn('[InsertUnit] Failed to get captions:', error);
      }
    }

    ctx.progress(95);
    console.log('[InsertUnit] Successfully extracted show stream');

    return {
      embeds: [],
      stream: [
        {
          id: 'primary',
          playlist: currentEpisode.hls,
          type: 'hls' as const,
          flags: [flags.CORS_ALLOWED],
          captions,
          preferredHeaders: {
            'Origin': baseUrl,
            'Referer': baseUrl
          },
          headers: {
            ...headers,
            'Referer': baseUrl
          }
        },
      ],
    };
  } catch (error) {
    console.error('[InsertUnit] Error in scrapeInsertUnitShow:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to scrape show');
  }
}

export async function scrapeInsertUnitMovie(ctx: MovieScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[InsertUnit] Starting movie scraping for TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const playerData = await ctx.proxiedFetcher<string>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl
      }
    });
    ctx.progress(35);

    const { stream, captions } = await parseMovieData(playerData);
    ctx.progress(90);
    console.log('[InsertUnit] Successfully extracted movie stream');

    return {
      embeds: [],
      stream: [
        {
          id: 'primary',
          type: 'hls' as const,
          playlist: stream,
          flags: [flags.CORS_ALLOWED],
          captions,
          preferredHeaders: {
            'Origin': baseUrl,
            'Referer': baseUrl
          },
          headers: {
            ...headers,
            'Referer': baseUrl
          }
        },
      ],
    };
  } catch (error) {
    console.error('[InsertUnit] Error in scrapeInsertUnitMovie:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to scrape movie');
  }
}
