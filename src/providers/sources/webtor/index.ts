import { UseableFetcher } from '@/fetchers/types';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { Stream } from '@/providers/streams';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

async function searchTorrents(fetcher: UseableFetcher, query: string): Promise<string[]> {
  const url = `https://webtor.io/api/search?q=${encodeURIComponent(query)}`;
  const data = await fetcher<{ magnets: string[] }>(url, {
    method: 'GET',
    headers: {
      Referer: 'https://webtor.io/',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  return data.magnets || [];
}

async function getStreamUrl(fetcher: UseableFetcher, magnet: string): Promise<Stream[]> {
  const url = `https://webtor.io/api/stream/create`;
  const data = await fetcher<{ streamUrl: string }>(url, {
    method: 'POST',
    headers: {
      Referer: 'https://webtor.io/',
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ magnet }),
  });

  if (!data.streamUrl) {
    return [];
  }

  return [
    {
      id: `webtor_${magnet.slice(0, 20)}`,
      type: 'hls',
      playlist: data.streamUrl,
      flags: [],
      captions: [],
      headers: {
        Referer: 'https://webtor.io/',
        'User-Agent': 'Mozilla/5.0',
      },
    },
  ];
}

export const webtorScraper = makeSourcerer({
  id: 'webtor',
  name: 'Webtor',
  rank: 180,
  flags: [],
  async scrapeMovie(input: MovieScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;
    const searchQuery = `${media.title} ${media.releaseYear}`;

    try {
      const magnets = await searchTorrents(fetcher, searchQuery);
      if (magnets.length === 0) {
        return { embeds: [], stream: [] };
      }

      // Try the first magnet link
      const streams = await getStreamUrl(fetcher, magnets[0]);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping webtor:', error);
      return { embeds: [], stream: [] };
    }
  },

  async scrapeShow(input: ShowScrapeContext): Promise<SourcererOutput> {
    const { media, fetcher } = input;
    const searchQuery = `${media.title} S${media.season.number.toString().padStart(2, '0')}E${media.episode.number.toString().padStart(2, '0')}`;

    try {
      const magnets = await searchTorrents(fetcher, searchQuery);
      if (magnets.length === 0) {
        return { embeds: [], stream: [] };
      }

      // Try the first magnet link
      const streams = await getStreamUrl(fetcher, magnets[0]);

      return {
        embeds: [],
        stream: streams,
      };
    } catch (error) {
      console.error('Error scraping webtor:', error);
      return { embeds: [], stream: [] };
    }
  },
});
