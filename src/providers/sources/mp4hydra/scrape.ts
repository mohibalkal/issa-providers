import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { Mp4HydraResponse } from './types';
import { buildStreamUrl, headers } from './utils';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext) {
  const url = buildStreamUrl(ctx);
  const data = await ctx.proxiedFetcher<Mp4HydraResponse>(url, { headers });

  if (!data?.streams?.length) {
    throw new NotFoundError('No streams found');
  }

  return {
    embeds: data.streams.map((stream, index) => ({
      embedId: `mp4hydra-${index + 1}`,
      url: stream.url,
      quality: stream.quality,
    })),
  };
}
