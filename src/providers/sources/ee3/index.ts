import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const ee3Scraper = makeSourcerer({
  id: 'ee3',
  name: 'EE3',
  rank: 150,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
