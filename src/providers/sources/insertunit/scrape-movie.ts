import { MovieScrapeContext } from '@/utils/context';
import { scrapeInsertUnitMovie } from './scrape';

export async function scrapeMovie(ctx: MovieScrapeContext) {
  return scrapeInsertUnitMovie(ctx);
}
