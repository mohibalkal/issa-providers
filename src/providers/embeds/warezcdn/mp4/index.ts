import { EmbedOutput, makeEmbed } from '@/providers/base';
import { flags } from '@/providers/flags';
import { Stream } from '@/providers/streams';
import { EmbedScrapeContext } from '@/utils/context';

interface WarezCdnResponse {
  url: string;
  quality: string;
}

async function getStream(url: string): Promise<Stream[]> {
  try {
    const response = await fetch(url);
    const data = (await response.json()) as WarezCdnResponse;

    return [
      {
        id: 'warezcdn_mp4',
        type: 'file',
        qualities: {
          [data.quality]: {
            type: 'mp4',
            url: data.url,
          },
        },
        flags: [flags.CORS_ALLOWED],
        captions: [],
      },
    ];
  } catch (error) {
    console.error('Error fetching WarezCDN MP4:', error);
    return [];
  }
}

export const warezcdnembedMp4Scraper = makeEmbed({
  id: 'warezcdn_mp4',
  name: 'WarezCDN MP4',
  rank: 150,
  async scrape(input: EmbedScrapeContext): Promise<EmbedOutput> {
    try {
      const streams = await getStream(input.url.toString());
      return { stream: streams };
    } catch (error) {
      console.error('Error scraping WarezCDN MP4:', error);
      return { stream: [] };
    }
  },
});
