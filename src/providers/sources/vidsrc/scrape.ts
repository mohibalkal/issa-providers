import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { VidSrcResponse, VidSrcSource, VidSrcSubtitle } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

async function extractStreamData(ctx: MovieScrapeContext | ShowScrapeContext, url: string): Promise<VidSrcResponse> {
  try {
    console.log(`[VidSrc] Fetching stream data from: ${url}`);
    const response = await ctx.proxiedFetcher<VidSrcResponse>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.status) {
      console.error('[VidSrc] Invalid response from server:', response);
      throw new NotFoundError('Invalid response from server');
    }

    console.log(`[VidSrc] Found ${response.result?.sources?.length || 0} sources`);
    return response;
  } catch (error) {
    console.error('[VidSrc] Error extracting stream data:', error);
    throw new NotFoundError('Failed to extract stream data');
  }
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[VidSrc] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const data = await extractStreamData(ctx, url);

    if (!data.result?.sources?.length) {
      console.warn('[VidSrc] No sources found in response');
      throw new NotFoundError('No streams found');
    }

    // معالجة الترجمات إذا كانت متوفرة
    const captions: Caption[] = (data.result.subtitles || [])
      .filter((sub: VidSrcSubtitle) => sub.lang && sub.url)
      .map((sub: VidSrcSubtitle) => ({
        id: `vidsrc_${sub.lang}`,
        language: sub.lang,
        url: sub.url,
        type: sub.url.endsWith('.vtt') ? 'vtt' : 'srt',
        hasCorsRestrictions: false,
      }));

    console.log(`[VidSrc] Found ${captions.length} subtitles`);

    // إنشاء الروابط لكل جودة
    const streams = data.result.sources
      .filter((source: VidSrcSource) => source.url && (source.type === 'hls' || source.type === 'mp4'))
      .map((stream: VidSrcSource, index: number) => {
        const isHLS = stream.type === 'hls' || stream.url.includes('.m3u8');
        console.log(`[VidSrc] Processing stream ${index + 1}/${data.result.sources.length} (${isHLS ? 'HLS' : 'MP4'})`);

        if (isHLS) {
          const hlsStream: HlsBasedStream = {
            id: `vidsrc_${ctx.media.tmdbId}_${index}`,
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
          id: `vidsrc_${ctx.media.tmdbId}_${index}`,
          type: 'file',
          qualities: {
            [stream.quality || 'unknown']: {
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

    console.log(`[VidSrc] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[VidSrc] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
} 