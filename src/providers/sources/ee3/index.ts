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
  let url = `https://ee3.me/api/media/${type}/${tmdbId}`;
  if (type === 'show' && season && episode) {
    url += `/season/${season}/episode/${episode}`;
  }

  const data = await fetcher<{ streams: Array<{ url: string; quality: string }> }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://ee3.me/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!data.streams?.length) {
    return [];
  }

  return data.streams.map((stream, index) => ({
    id: `ee3_${tmdbId}_${index}`,
    type: 'hls',
    playlist: stream.url,
    flags: [],
    captions: [],
    headers: {
      Referer: 'https://ee3.me/',
      'User-Agent': 'Mozilla/5.0',
    },
  }));
}

export const ee3Scraper = makeSourcerer({
  id: 'ee3',
  name: 'EE3',
  rank: 150,
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
      console.error('Error scraping ee3:', error);
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
      console.error('Error scraping ee3:', error);
      return { embeds: [], stream: [] };
    }
  },
});
