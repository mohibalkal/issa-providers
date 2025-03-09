import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const webtorScraper = makeSourcerer({
  id: 'webtor',
  name: 'Webtor',
  rank: 160,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
