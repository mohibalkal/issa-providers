import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { VidSrcResponse, VidSrcSource, VidSrcSubtitle } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    const url = buildStreamUrl(ctx);
    const data = await ctx.proxiedFetcher<VidSrcResponse>(url, { headers });

    if (!data.status || !data.result?.sources?.length) {
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

    // إنشاء الروابط لكل جودة
    const streams = data.result.sources.map((stream: VidSrcSource, index: number) => {
      const isHLS = stream.type === 'hls' || stream.url.includes('.m3u8');

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
            ...headers
          }
        };
        return hlsStream;
      }

      const fileStream: FileBasedStream = {
        id: `vidsrc_${ctx.media.tmdbId}_${index}`,
        type: 'file',
        qualities: {
          [stream.quality]: {
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
          ...headers
        }
      };
      return fileStream;
    });

    // التحقق من صحة الروابط
    const validStreams = streams.filter((stream: FileBasedStream | HlsBasedStream): stream is Stream => {
      if (stream.type === 'hls' && 'playlist' in stream) return true;
      if (stream.type === 'file' && 'qualities' in stream && Object.keys(stream.qualities).length > 0) return true;
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