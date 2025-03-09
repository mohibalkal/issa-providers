import { Caption } from '@/providers/captions';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { InsertUnitResponse } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { Stream } from '@/providers/streams';
import { SourcererOutput } from '@/providers/base';

import { getCaptions } from './captions';
import { Season } from './types';

export const insertUnitBase = 'https://insertunit.com/';

async function parseShowData(data: string) {
  const seasonDataJSONregex = /seasons\s*:\s*(\[[^\]]*\])/;
  const seasonData = seasonDataJSONregex.exec(data);

  if (!seasonData?.[1]) {
    throw new NotFoundError('No seasons data found');
  }

  try {
    return JSON.parse(seasonData[1].replace(/'/g, '"')) as Season[];
  } catch (error) {
    throw new NotFoundError('Invalid seasons data');
  }
}

async function parseMovieData(data: string) {
  const streamRegex = /hls\s*:\s*"([^"]*)"/;
  const streamData = streamRegex.exec(data);

  if (!streamData?.[1]) {
    throw new NotFoundError('No stream data found');
  }

  const subtitleRegex = /cc\s*:\s*(\[[^\]]*\])/;
  const subtitleJSONData = subtitleRegex.exec(data);

  let captions: Caption[] = [];

  if (subtitleJSONData?.[1]) {
    try {
      const subtitleData = JSON.parse(subtitleJSONData[1].replace(/'/g, '"'));
      captions = await getCaptions(subtitleData);
    } catch (error) {
      console.warn('Failed to parse captions:', error);
    }
  }

  return {
    stream: streamData[1],
    captions,
  };
}

export async function scrapeInsertUnitShow(ctx: ShowScrapeContext) {
  try {
    const playerData = await ctx.proxiedFetcher<string>(`/api/embed/imdb/${ctx.media.imdbId}`, {
      baseUrl: insertUnitBase,
      headers: {
        'Referer': insertUnitBase
      }
    });
    ctx.progress(30);

    const seasonTable = await parseShowData(playerData);
    ctx.progress(60);

    const currentSeason = seasonTable.find(
      (seasonElement) => seasonElement.season === ctx.media.season.number && !seasonElement.blocked,
    );

    if (!currentSeason) {
      throw new NotFoundError('Season not found');
    }

    const currentEpisode = currentSeason.episodes.find((episodeElement) =>
      episodeElement.episode === ctx.media.episode.number.toString(),
    );

    if (!currentEpisode?.hls) {
      throw new NotFoundError('Episode not found');
    }

    let captions: Caption[] = [];
    if (currentEpisode.cc) {
      try {
        captions = await getCaptions(currentEpisode.cc);
      } catch (error) {
        console.warn('Failed to get captions:', error);
      }
    }

    ctx.progress(95);

    return {
      embeds: [],
      stream: [
        {
          id: 'primary',
          playlist: currentEpisode.hls,
          type: 'hls' as const,
          flags: [flags.CORS_ALLOWED],
          captions,
        },
      ],
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to scrape show');
  }
}

export async function scrapeInsertUnitMovie(ctx: MovieScrapeContext) {
  try {
    const playerData = await ctx.proxiedFetcher<string>(`/api/embed/imdb/${ctx.media.imdbId}`, {
      baseUrl: insertUnitBase,
      headers: {
        'Referer': insertUnitBase
      }
    });
    ctx.progress(35);

    const { stream, captions } = await parseMovieData(playerData);
    ctx.progress(90);

    return {
      embeds: [],
      stream: [
        {
          id: 'primary',
          type: 'hls' as const,
          playlist: stream,
          flags: [flags.CORS_ALLOWED],
          captions,
        },
      ],
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to scrape movie');
  }
}
