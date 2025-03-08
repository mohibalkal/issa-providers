import { UseableFetcher } from '@/fetchers/types';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { Stream } from '@/providers/streams';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

async function searchContent(fetcher: UseableFetcher, query: string): Promise<string[]> {
  const searchUrl = `https://uira.live/search?q=${encodeURIComponent(query)}`;
  const data = await fetcher<{ results: string[] }>(searchUrl, {
    method: 'GET',
    headers: {
      Referer: 'https://uira.live/',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  return data.results || [];
}

async function extractStreams(fetcher: UseableFetcher, contentId: string): Promise<Stream[]> {
  const url = `https://uira.live/api/content/${contentId}/streams`;
  const data = await fetcher<{ streams: Array<{ quality: string; url: string }> }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://uira.live/',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  return data.streams.map((stream, index) => ({
    id: `uira_${contentId}_${index}`,
    type: 'hls',
    playlist: stream.url,
    flags: [],
    captions: [],
    headers: {
      Referer: 'https://uira.live/',
      'User-Agent': 'Mozilla/5.0',
    },
  }));
}

export const uiraLiveScraper = makeSourcerer({
  id: 'uira.live',
  name: 'Uira Live',
  rank: 120,
  flags: [],
  async scrapeMovie(input: MovieScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;
    const searchQuery = `${media.title} ${media.releaseYear}`;

    try {
      const searchResults = await searchContent(fetcher, searchQuery);
      if (searchResults.length === 0) {
        return { embeds: [], stream: [] };
      }

      // Assume first result is most relevant
      const streams = await extractStreams(fetcher, searchResults[0]);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping uira.live:', error);
      return { embeds: [], stream: [] };
    }
  },

  async scrapeShow(input: ShowScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;
    const searchQuery = `${media.title} season ${media.season.number} episode ${media.episode.number}`;

    try {
      const searchResults = await searchContent(fetcher, searchQuery);
      if (searchResults.length === 0) {
        return { embeds: [], stream: [] };
      }

      // Assume first result is most relevant
      const streams = await extractStreams(fetcher, searchResults[0]);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping uira.live:', error);
      return { embeds: [], stream: [] };
    }
  },
});
