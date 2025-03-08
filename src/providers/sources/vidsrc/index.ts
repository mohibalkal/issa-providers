import { flags } from '@/entrypoint/utils/targets';
import { UseableFetcher } from '@/fetchers/types';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { Caption } from '@/providers/captions';
import { Stream } from '@/providers/streams';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

interface VidSrcResponse {
  status: boolean;
  result: {
    sources: Array<{
      url: string;
      quality: string;
      type: string;
    }>;
    subtitles: Array<{
      url: string;
      lang: string;
      language: string;
    }>;
  };
}

async function getStreamUrl(
  fetcher: UseableFetcher,
  tmdbId: string,
  type: 'movie' | 'show',
  season?: number,
  episode?: number,
): Promise<Stream[]> {
  // Create the API URL
  let url;
  if (type === 'movie') {
    url = `https://vidsrc.to/embed/movie/${tmdbId}`;
  } else {
    url = `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  // Make the API request
  const data = await fetcher<VidSrcResponse>(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://vidsrc.me/',
    },
  });

  if (!data.status || !data.result?.sources?.length) {
    return [];
  }

  // Process subtitles if available
  const captions: Caption[] = [];
  data.result.subtitles?.forEach((sub) => {
    if (!sub.lang) return;

    captions.push({
      id: `vidsrc_${sub.lang}`,
      language: sub.lang,
      url: sub.url,
      type: sub.url.endsWith('.vtt') ? 'vtt' : 'srt',
      hasCorsRestrictions: false,
    });
  });

  // Create streams for each quality
  return data.result.sources.map((stream, index) => {
    const isHLS = stream.type === 'hls' || stream.url.includes('.m3u8');

    if (isHLS) {
      return {
        id: `vidsrc_${tmdbId}_${index}`,
        type: 'hls',
        playlist: stream.url,
        flags: [flags.CORS_ALLOWED],
        captions,
        headers: {
          Referer: 'https://vidsrc.me/',
          'User-Agent': 'Mozilla/5.0',
        },
      } as Stream;
    }

    return {
      id: `vidsrc_${tmdbId}_${index}`,
      type: 'file',
      qualities: {
        [stream.quality]: {
          type: 'mp4',
          url: stream.url,
        },
      },
      flags: [flags.CORS_ALLOWED],
      captions,
      headers: {
        Referer: 'https://vidsrc.me/',
        'User-Agent': 'Mozilla/5.0',
      },
    } as Stream;
  });
}

export const vidsrcScraper = makeSourcerer({
  id: 'vidsrc',
  name: 'VidSrc',
  rank: 210,
  flags: [flags.CORS_ALLOWED],
  async scrapeMovie(input: MovieScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;

    try {
      const streams = await getStreamUrl(fetcher, media.tmdbId, 'movie');

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping vidsrc:', error);
      return { embeds: [], stream: [] };
    }
  },

  async scrapeShow(input: ShowScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;

    try {
      const streams = await getStreamUrl(fetcher, media.tmdbId, 'show', media.season.number, media.episode.number);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping vidsrc:', error);
      return { embeds: [], stream: [] };
    }
  },
});
