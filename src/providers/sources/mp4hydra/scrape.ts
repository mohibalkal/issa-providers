import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { Mp4HydraResponse } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { flags } from '@/entrypoint/utils/targets';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext) {
  try {
    const url = buildStreamUrl(ctx);
    const data = await ctx.proxiedFetcher<Mp4HydraResponse>(url, { 
      headers: {
        ...headers,
        'Origin': baseUrl,
        'Referer': baseUrl
      }
    });

    if (!data?.streams?.length) {
      throw new NotFoundError('No streams found');
    }

    // التحقق من صحة الروابط قبل إرجاعها
    const validStreams = data.streams.filter(stream => stream.url && stream.url.length > 0);
    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      embeds: validStreams.map((stream, index) => ({
        embedId: `mp4hydra-${index + 1}`,
        url: stream.url,
        quality: stream.quality || 'unknown',
        type: 'file',
        flags: [flags.CORS_ALLOWED]
      })),
      captions: data.captions?.map(caption => ({
        id: caption.id,
        url: caption.url,
        language: caption.language,
        type: caption.type || 'srt'
      })) || []
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
}
