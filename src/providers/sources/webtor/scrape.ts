import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { WebtorResponse } from './types';
import { buildStreamUrl, formatQuality, headers } from './utils';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext) {
  const url = buildStreamUrl(ctx);
  const data = await ctx.proxiedFetcher<WebtorResponse>(url, { headers });

  if (!data?.streams?.length) {
    throw new NotFoundError('No streams found');
  }

  return {
    embeds: data.streams.map((stream, index) => ({
      embedId: `webtor-${index + 1}`,
      url: stream.url,
      quality: stream.quality || formatQuality(stream.size),
      type: stream.type || 'torrent',
    })),
    meta: {
      title: data.title,
      hash: data.hash,
    },
  };
}
