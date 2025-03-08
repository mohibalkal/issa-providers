import { UseableFetcher } from '@/fetchers/types';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { Stream } from '@/providers/streams';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

async function getStreamUrl(
  fetcher: UseableFetcher,
  imdbId: string,
  type: 'movie' | 'show',
  season?: number,
  episode?: number,
): Promise<Stream[]> {
  let url = `https://embed.su/api/source/${imdbId}`;
  if (type === 'show' && season && episode) {
    url += `/season/${season}/episode/${episode}`;
  }

  const data = await fetcher<{ streams: Array<{ file: string; label: string }> }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://embed.su/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!data.streams?.length) {
    return [];
  }

  return data.streams.map((stream, index) => ({
    id: `embedsu_${imdbId}_${index}`,
    type: 'hls',
    playlist: stream.file,
    flags: [],
    captions: [],
    headers: {
      Referer: 'https://embed.su/',
      'User-Agent': 'Mozilla/5.0',
    },
  }));
}

export const embedSuScraper = makeSourcerer({
  id: 'embed.su',
  name: 'Embed.su',
  rank: 130,
  flags: [],
  async scrapeMovie(input: MovieScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;

    try {
      if (!media.imdbId) {
        return { embeds: [], stream: [] };
      }

      const streams = await getStreamUrl(fetcher, media.imdbId, 'movie');

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping embed.su:', error);
      return { embeds: [], stream: [] };
    }
  },

  async scrapeShow(input: ShowScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;

    try {
      if (!media.imdbId) {
        return { embeds: [], stream: [] };
      }

      const streams = await getStreamUrl(fetcher, media.imdbId, 'show', media.season.number, media.episode.number);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping embed.su:', error);
      return { embeds: [], stream: [] };
    }
  },
});
