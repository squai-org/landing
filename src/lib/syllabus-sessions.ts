import type { z } from 'astro/zod';
import type { serviceSchema } from '../content/schema';

type Syllabus = NonNullable<z.infer<typeof serviceSchema>['syllabus']>;

export interface SyllabusSession {
  number: number;
  moduleNumber: number;
  moduleTitle: string;
  focus: string;
  topics: string[];
  illustration: string;
  alt: string;
}

function topicsForSession(topics: string[], sessionCount: number, offset: number): string[] {
  const size = Math.floor(topics.length / sessionCount);
  const extra = topics.length % sessionCount;
  const start = offset * size + Math.min(offset, extra);
  const own = topics.slice(start, start + size + (offset < extra ? 1 : 0));
  return own.length > 0 ? own : topics;
}

export function sessionsOf(syllabus: Pick<Syllabus, 'modules'>): SyllabusSession[] {
  let number = 0;
  return syllabus.modules.flatMap((module, moduleIndex) =>
    module.sessions.map((focus, offset) => {
      const art = module.sessionArt?.[offset] ?? { illustration: module.illustration, alt: module.alt };
      number += 1;
      return {
        number,
        moduleNumber: moduleIndex + 1,
        moduleTitle: module.t,
        focus,
        topics: topicsForSession(module.topics, module.sessions.length, offset),
        illustration: art.illustration,
        alt: art.alt,
      };
    }),
  );
}
