import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { siteSchema } from './content/schema';

const copies = defineCollection({
  loader: file('src/content/copies.json'),
  schema: siteSchema,
});

export const collections = { copies };
