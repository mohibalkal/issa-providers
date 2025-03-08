import { UseableFetcher } from '@/fetchers/types';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { Stream } from '@/providers/streams';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

async function getStreamUrl(
  fetcher: UseableFetcher,
  tmdbId: string,
  type: 'movie' | 'show',
  season?: number,
  episode?: number,
): Promise<Stream[]> {
  let url = `https://orion.tv/api/v1/${type}/${tmdbId}`;
  if (type === 'show' && season && episode) {
    url += `/season/${season}/episode/${episode}`;
  }

  const data = await fetcher<{ streams: Array<{ url: string; quality: string }> }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://orion.tv/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!data.streams?.length) {
    return [];
  }

  return data.streams.map((stream, index) => ({
    id: `orion_${tmdbId}_${index}`,
    type: 'hls',
    playlist: stream.url,
    flags: [],
    captions: [],
    headers: {
      Referer: 'https://orion.tv/',
      'User-Agent': 'Mozilla/5.0',
    },
  }));
}

export const orionScraper = makeSourcerer({
  id: 'orion',
  name: 'Orion',
  rank: 190,
  flags: [],
  async scrapeMovie(input: MovieScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;

    try {
      const streams = await getStreamUrl(fetcher, media.tmdbId, 'movie');

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping orion:', error);
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
      console.error('Error scraping orion:', error);
      return { embeds: [], stream: [] };
    }
  },
});
