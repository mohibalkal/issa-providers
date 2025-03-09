import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { VidApiClickResponse, VidApiClickSource, VidApiClickSubtitle } from './types';
import { buildStreamUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

async function extractStreamData(ctx: MovieScrapeContext | ShowScrapeContext, url: string): Promise<VidApiClickResponse> {
  try {
    console.log(`[VidApiClick] Fetching stream data from: ${url}`);
    const response = await ctx.proxiedFetcher<VidApiClickResponse>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.success) {
      console.error('[VidApiClick] Invalid response from server:', response);
      throw new NotFoundError('Invalid response from server');
    }

    if (!response.data?.sources?.length) {
      console.error('[VidApiClick] No sources found in response');
      throw new NotFoundError('No sources found');
    }

    console.log(`[VidApiClick] Found ${response.data.sources.length} sources`);
    return response;
  } catch (error) {
    console.error('[VidApiClick] Error extracting stream data:', error);
    throw new NotFoundError('Failed to extract stream data');
  }
}

function processCaptions(tracks?: VidApiClickSubtitle[]): Caption[] {
  if (!tracks?.length) {
    return [];
  }

  console.log(`[VidApiClick] Processing ${tracks.length} subtitles`);
  return tracks
    .filter(track => track.file && track.label && track.kind === 'captions')
    .map(track => ({
      id: `vidapiclick_${track.label.toLowerCase()}`,
      language: track.label,
      url: track.file,
      type: track.file.endsWith('.vtt') ? 'vtt' : 'srt',
      hasCorsRestrictions: false,
    }));
}

function processStreams(sources: VidApiClickSource[], captions: Caption[], ctx: MovieScrapeContext | ShowScrapeContext): Stream[] {
  return sources
    .filter(source => source.file)
    .map((stream, index) => {
      const isHLS = stream.type === 'hls' || stream.file.includes('.m3u8');
      console.log(`[VidApiClick] Processing stream ${index + 1}/${sources.length} (${isHLS ? 'HLS' : 'MP4'}) - Quality: ${stream.label || 'unknown'}`);

      if (isHLS) {
        const hlsStream: HlsBasedStream = {
          id: `vidapiclick_${ctx.media.tmdbId}_${index}`,
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
        id: `vidapiclick_${ctx.media.tmdbId}_${index}`,
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
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[VidApiClick] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    const url = buildStreamUrl(ctx);
    const data = await extractStreamData(ctx, url);

    if (!data.data) {
      throw new NotFoundError('Invalid response: missing data object');
    }

    const captions = processCaptions(data.data.tracks);
    console.log(`[VidApiClick] Found ${captions.length} captions`);

    // إنشاء الروابط لكل جودة
    const streams = processStreams(data.data.sources, captions, ctx);

    // التحقق من صحة الروابط
    const validStreams = streams.filter((stream: FileBasedStream | HlsBasedStream): stream is Stream => {
      if (stream.type === 'hls' && 'playlist' in stream && stream.playlist) return true;
      if (stream.type === 'file' && 'qualities' in stream && Object.keys(stream.qualities).length > 0) return true;
      return false;
    });

    console.log(`[VidApiClick] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[VidApiClick] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
}
