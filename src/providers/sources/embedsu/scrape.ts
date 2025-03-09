import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { EmbedSuResponse, EmbedSuStream, EmbedSuSubtitle } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

async function extractStreamData(ctx: MovieScrapeContext | ShowScrapeContext, url: string): Promise<EmbedSuResponse> {
  try {
    console.log(`[EmbedSu] Fetching stream data from: ${url}`);
    const response = await ctx.proxiedFetcher<EmbedSuResponse>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.status) {
      console.error('[EmbedSu] Invalid response from server:', response);
      throw new NotFoundError('Invalid response from server');
    }

    console.log(`[EmbedSu] Found ${response.result?.sources?.length || 0} sources`);
    return response;
  } catch (error) {
    console.error('[EmbedSu] Error extracting stream data:', error);
    throw new NotFoundError('Failed to extract stream data');
  }
}

function processCaptions(tracks?: EmbedSuSubtitle[]): Caption[] {
  if (!tracks?.length) {
    return [];
  }

  console.log(`[EmbedSu] Processing ${tracks.length} subtitles`);
  return tracks
    .filter(track => track.file && track.label)
    .map(track => ({
      id: `embedsu_${track.label}`,
      language: track.language || track.label,
      url: track.file,
      type: track.file.endsWith('.vtt') ? 'vtt' : 'srt',
      hasCorsRestrictions: false,
    }));
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[EmbedSu] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const data = await extractStreamData(ctx, url);

    if (!data.result?.sources?.length) {
      console.warn('[EmbedSu] No sources found in response');
      throw new NotFoundError('No streams found');
    }

    const captions = processCaptions(data.result.tracks);
    console.log(`[EmbedSu] Found ${captions.length} captions`);

    // إنشاء الروابط لكل جودة
    const streams = data.result.sources
      .filter((source: EmbedSuStream) => source.file && (source.type === 'hls' || !source.type))
      .map((stream: EmbedSuStream, index: number) => {
        const isHLS = stream.type === 'hls' || stream.file.includes('.m3u8');
        console.log(`[EmbedSu] Processing stream ${index + 1}/${data.result.sources.length} (${isHLS ? 'HLS' : 'MP4'})`);

        if (isHLS) {
          const hlsStream: HlsBasedStream = {
            id: `embedsu_${ctx.media.tmdbId}_${index}`,
            type: 'hls',
            playlist: stream.file,
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
          id: `embedsu_${ctx.media.tmdbId}_${index}`,
          type: 'file',
          qualities: {
            [stream.label || 'unknown']: {
              type: 'mp4',
              url: stream.file
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

    console.log(`[EmbedSu] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[EmbedSu] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
} 