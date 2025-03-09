import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { WebtorSearchResponse, WebtorStreamResponse } from './types';
import { buildSearchQuery, headers, baseUrl } from './utils';
import { Stream } from '@/providers/streams';
import { SourcererOutput } from '@/providers/base';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    // البحث عن التورنتات
    const searchQuery = buildSearchQuery(ctx);
    const searchData = await ctx.proxiedFetcher<WebtorSearchResponse>('/api/search', {
      baseUrl,
      headers,
      query: {
        q: searchQuery
      }
    });

    if (!searchData?.magnets?.length) {
      throw new NotFoundError('No magnets found');
    }

    // إنشاء رابط البث
    const streamData = await ctx.proxiedFetcher<WebtorStreamResponse>('/api/stream/create', {
      baseUrl,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ magnet: searchData.magnets[0] })
    });

    if (!streamData?.streamUrl) {
      throw new NotFoundError('No stream URL found');
    }

    const stream = {
      id: `webtor_${searchData.magnets[0].slice(0, 20)}`,
      type: 'hls' as const,
      playlist: streamData.streamUrl,
      flags: [flags.CORS_ALLOWED],
      captions: [],
      preferredHeaders: {
        'Origin': baseUrl,
        'Referer': baseUrl
      },
      headers: {
        ...headers
      }
    };

    // التحقق من صحة الرابط
    if (!stream.playlist) {
      throw new NotFoundError('Invalid stream URL');
    }

    return {
      stream: [stream],
      embeds: []
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch stream');
  }
}
