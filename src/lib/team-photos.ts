import type { ImageMetadata } from 'astro';
import type { teamPhotos } from '../content/schema';
import team1 from '../assets/team1.webp';
import team2 from '../assets/team2.webp';
import team3 from '../assets/team3.webp';
import team4 from '../assets/team4.webp';
import team5 from '../assets/team5.webp';
import team6 from '../assets/team6.webp';

export const teamImages = {
  '/images/team1.webp': team1,
  '/images/team2.webp': team2,
  '/images/team3.webp': team3,
  '/images/team4.webp': team4,
  '/images/team5.webp': team5,
  '/images/team6.webp': team6,
} satisfies Record<(typeof teamPhotos)[number], ImageMetadata>;
