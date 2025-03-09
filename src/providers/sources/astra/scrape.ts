import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { AstraResponse, AstraStream, AstraSubtitle } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

async function extractStreamData(ctx: MovieScrapeContext | ShowScrapeContext, url: string): Promise<AstraResponse> {
  try {
    console.log(`[Astra] Fetching stream data from: ${url}`);
    const response = await ctx.proxiedFetcher<AstraResponse>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.status) {
      console.error('[Astra] Invalid response from server:', response);
      throw new NotFoundError('Invalid response from server');
    }

    if (!response.result?.sources?.length) {
      console.error('[Astra] No sources found in response');
      throw new NotFoundError('No sources found');
    }

    console.log(`[Astra] Found ${response.result.sources.length} sources`);
    return response;
  } catch (error) {
    console.error('[Astra] Error extracting stream data:', error);
    throw new NotFoundError('Failed to extract stream data');
  }
}

function processCaptions(subtitles?: AstraSubtitle[]): Caption[] {
  if (!subtitles?.length) {
    return [];
  }

  console.log(`[Astra] Processing ${subtitles.length} subtitles`);
  return subtitles
    .filter(sub => sub.url && (sub.lang || sub.language))
    .map(sub => ({
      id: `astra_${sub.lang}`,
      language: sub.language || sub.lang,
      url: sub.url,
      type: sub.url.endsWith('.vtt') ? 'vtt' : 'srt',
      hasCorsRestrictions: false,
    }));
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[Astra] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const data = await extractStreamData(ctx, url);

    const captions = processCaptions(data.result?.subtitles);
    console.log(`[Astra] Found ${captions.length} captions`);

    // إنشاء الروابط لكل جودة
    const streams = data.result.sources
      .filter((source: AstraStream) => source.url && (source.type === 'hls' || !source.type))
      .map((stream: AstraStream, index: number) => {
        const isHLS = stream.type === 'hls' || stream.url.includes('.m3u8');
        console.log(`[Astra] Processing stream ${index + 1}/${data.result.sources.length} (${isHLS ? 'HLS' : 'MP4'}) - Quality: ${stream.quality || 'unknown'}`);

        if (isHLS) {
          const hlsStream: HlsBasedStream = {
            id: `astra_${ctx.media.tmdbId}_${index}`,
            type: 'hls',
            playlist: stream.url,
            flags: [flags.CORS_ALLOWED],
            captions,
            preferredHeaders: {
              'Origin': baseUrl,
              'Referer': baseUrl
            },
            headers: {
              ...headers,
              'Referer': baseUrl
            }
          };
          return hlsStream;
        }

        const fileStream: FileBasedStream = {
          id: `astra_${ctx.media.tmdbId}_${index}`,
          type: 'file',
          qualities: {
            [stream.quality || stream.label || 'unknown']: {
              type: 'mp4',
              url: stream.url
            }
          },
          flags: [flags.CORS_ALLOWED],
          captions,
          preferredHeaders: {
            'Origin': baseUrl,
            'Referer': baseUrl
          },
          headers: {
            ...headers,
            'Referer': baseUrl
          }
        };
        return fileStream;
      });

    // التحقق من صحة الروابط
    const validStreams = streams.filter((stream: FileBasedStream | HlsBasedStream): stream is Stream => {
      if (stream.type === 'hls' && 'playlist' in stream && stream.playlist) return true;
      if (stream.type === 'file' && 'qualities' in stream && Object.keys(stream.qualities).length > 0) return true;
      return false;
    });

    console.log(`[Astra] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[Astra] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
} 