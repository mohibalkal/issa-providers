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
  let url = `https://vidsrc.su/api/source/${type}/${tmdbId}`;
  if (type === 'show' && season && episode) {
    url += `/season/${season}/episode/${episode}`;
  }

  const data = await fetcher<{ sources: Array<{ url: string; quality: string }> }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://vidsrc.su/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!data.sources?.length) {
    return [];
  }

  return data.sources.map((source, index) => ({
    id: `vidsrcsu_${tmdbId}_${index}`,
    type: 'hls',
    playlist: source.url,
    flags: [],
    captions: [],
    headers: {
      Referer: 'https://vidsrc.su/',
      'User-Agent': 'Mozilla/5.0',
    },
  }));
}

export const vidsrcSuScraper = makeSourcerer({
  id: 'vidsrc.su',
  name: 'VidSrc.su',
  rank: 140,
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
      console.error('Error scraping vidsrc.su:', error);
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
      console.error('Error scraping vidsrc.su:', error);
      return { embeds: [], stream: [] };
    }
  },
});
