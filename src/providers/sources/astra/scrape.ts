import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { AstraResponse } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { Stream } from '@/providers/streams';
import { SourcererOutput } from '@/providers/base';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    const url = buildStreamUrl(ctx);
    const data = await ctx.proxiedFetcher<AstraResponse>(url, { headers });

    if (!data?.streams?.length) {
      throw new NotFoundError('No streams found');
    }

    // إنشاء الروابط لكل جودة
    const streams = data.streams.map((stream, index) => {
      const baseStream = {
        id: `astra_${ctx.media.tmdbId}_${index}`,
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

      return {
        ...baseStream,
        type: 'hls' as const,
        playlist: stream.url
      };
    });

    // التحقق من صحة الروابط
    const validStreams = streams.filter(stream => {
      if (stream.type === 'hls' && stream.playlist) return true;
      return false;
    });

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
} 