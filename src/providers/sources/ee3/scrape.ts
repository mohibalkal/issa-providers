import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { EE3Response, EE3Stream, EE3Subtitle } from './types';
import { buildStreamUrl, buildBackupUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream, HlsBasedStream } from '@/providers/streams';
import { Caption } from '@/providers/captions';

async function extractStreamData(ctx: MovieScrapeContext | ShowScrapeContext, url: string): Promise<EE3Response> {
  try {
    console.log(`[EE3] Fetching stream data from: ${url}`);
    const response = await ctx.proxiedFetcher<EE3Response>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.status) {
      console.error('[EE3] Invalid response from server:', response);
      throw new NotFoundError('Invalid response from server');
    }

    if (!response.result?.sources?.length) {
      console.error('[EE3] No sources found in response');
      throw new NotFoundError('No sources found');
    }

    console.log(`[EE3] Found ${response.result.sources.length} sources`);
    return response;
  } catch (error) {
    console.error('[EE3] Error extracting stream data:', error);
    throw new NotFoundError('Failed to extract stream data');
  }
}

async function tryBackupSources(ctx: MovieScrapeContext | ShowScrapeContext): Promise<EE3Response> {
  try {
    const backupUrl = buildBackupUrl(ctx);
    console.log(`[EE3] Trying backup sources from: ${backupUrl}`);
    const response = await ctx.proxiedFetcher<EE3Response>(backupUrl, {
      headers: {
        ...headers,
        'Referer': baseUrl,
        'Origin': baseUrl
      }
    });

    if (!response || !response.status || !response.result?.sources?.length) {
      console.error('[EE3] No backup sources found');
      throw new NotFoundError('No backup sources found');
    }

    console.log(`[EE3] Found ${response.result.sources.length} backup sources`);
    return response;
  } catch (error) {
    console.error('[EE3] Error fetching backup sources:', error);
    throw error;
  }
}

function processCaptions(subtitles?: EE3Subtitle[]): Caption[] {
  if (!subtitles?.length) {
    return [];
  }

  console.log(`[EE3] Processing ${subtitles.length} subtitles`);
  return subtitles
    .filter(sub => sub.url && (sub.lang || sub.language))
    .map(sub => ({
      id: `ee3_${sub.lang}`,
      language: sub.language || sub.lang,
      url: sub.url,
      type: sub.url.endsWith('.vtt') ? 'vtt' : 'srt',
      hasCorsRestrictions: false,
    }));
}

function processStreams(sources: EE3Stream[], captions: Caption[], ctx: MovieScrapeContext | ShowScrapeContext): Stream[] {
  return sources
    .filter(source => source.url && (source.type === 'hls' || !source.type))
    .map((stream, index) => {
      const isHLS = stream.type === 'hls' || stream.url.includes('.m3u8');
      console.log(`[EE3] Processing stream ${index + 1}/${sources.length} (${isHLS ? 'HLS' : 'MP4'}) - Quality: ${stream.quality || 'unknown'}`);

      if (isHLS) {
        const hlsStream: HlsBasedStream = {
          id: `ee3_${ctx.media.tmdbId}_${index}`,
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
        id: `ee3_${ctx.media.tmdbId}_${index}`,
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
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[EE3] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    let data: EE3Response;
    
    try {
      const url = buildStreamUrl(ctx);
      data = await extractStreamData(ctx, url);
    } catch (error) {
      console.log('[EE3] Primary source failed, trying backup sources');
      data = await tryBackupSources(ctx);
    }

    if (!data.result) {
      throw new NotFoundError('Invalid response: missing result object');
    }

    const captions = processCaptions(data.result.subtitles);
    console.log(`[EE3] Found ${captions.length} captions`);

    // إنشاء الروابط لكل جودة
    const mainStreams = processStreams(data.result.sources, captions, ctx);
    let backupStreams: Stream[] = [];

    if (data.result.backup_sources?.length) {
      console.log(`[EE3] Processing ${data.result.backup_sources.length} backup streams`);
      backupStreams = processStreams(data.result.backup_sources, captions, ctx);
    }

    const allStreams = [...mainStreams, ...backupStreams];

    // التحقق من صحة الروابط
    const validStreams = allStreams.filter((stream: FileBasedStream | HlsBasedStream): stream is Stream => {
      if (stream.type === 'hls' && 'playlist' in stream && stream.playlist) return true;
      if (stream.type === 'file' && 'qualities' in stream && Object.keys(stream.qualities).length > 0) return true;
      return false;
    });

    console.log(`[EE3] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[EE3] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
} 