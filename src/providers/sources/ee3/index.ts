import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const ee3 = makeSourcerer({
  id: 'ee3',
  name: 'EE3',
  rank: 180,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
