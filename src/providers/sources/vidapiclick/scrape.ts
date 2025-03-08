import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { VidapiResponse } from './types';
import { buildStreamUrl, headers } from './utils';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext) {
  const url = buildStreamUrl(ctx);
  const data = await ctx.proxiedFetcher<VidapiResponse>(url, { headers });

  if (!data?.streams?.length) {
    throw new NotFoundError('No streams found');
  }

  return {
    embeds: data.streams.map((stream, index) => ({
      embedId: `vidapi-${index + 1}`,
      url: stream.url,
      quality: stream.quality,
      type: stream.type,
    })),
    captions: data.subtitles?.map(sub => ({
      url: sub.url,
      language: sub.lang,
    })) || [],
  };
}
