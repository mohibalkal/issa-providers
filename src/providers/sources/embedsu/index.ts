import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const embedSuScraper = makeSourcerer({
  id: 'embedsu',
  name: 'EmbedSu',
  rank: 170,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
