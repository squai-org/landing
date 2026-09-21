import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { serviceSchema, siteSchema } from './content/schema';

const copies = defineCollection({
  loader: file('src/content/copies.json'),
  schema: siteSchema,
});

// Un archivo por servicio: el nombre del archivo es el slug de la pagina.
const services = defineCollection({
  loader: glob({ base: 'src/content/services', pattern: '*.json' }),
  schema: serviceSchema,
});

export const collections = { copies, services };
