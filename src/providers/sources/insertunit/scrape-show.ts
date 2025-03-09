import { ShowScrapeContext } from '@/utils/context';
import { scrapeInsertUnitShow } from './scrape';

export async function scrapeShow(ctx: ShowScrapeContext) {
  return scrapeInsertUnitShow(ctx);
}
