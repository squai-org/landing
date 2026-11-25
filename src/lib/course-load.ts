export interface CourseLoad {
  weeks: number;
  sessionsPerWeek: number;
  sessionMinutes: number;
}

interface CountWords {
  one: string;
  many: string;
}

export interface WorkloadWords {
  summary: string;
  session: CountWords;
  week: CountWords;
  hour: CountWords;
  minute: CountWords;
  halfHour: string;
  hoursAndMinutes: string;
}

const plural = (count: number, words: CountWords) => `${count} ${count === 1 ? words.one : words.many}`;

export const totalSessions = ({ weeks, sessionsPerWeek }: CourseLoad) => weeks * sessionsPerWeek;

export const totalMinutes = (load: CourseLoad) => totalSessions(load) * load.sessionMinutes;

export const durationInHours = (load: CourseLoad) => totalMinutes(load) / 60;

export const sessionLength = (minutes: number, words: WorkloadWords): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return plural(rest, words.minute);
  if (rest === 0) return plural(hours, words.hour);
  if (rest === 30) return words.halfHour.replace('{hours}', plural(hours, words.hour));
  return words.hoursAndMinutes.replace('{hours}', plural(hours, words.hour)).replace('{minutes}', plural(rest, words.minute));
};

export const courseLoadSummary = (load: CourseLoad, words: WorkloadWords): string =>
  words.summary
    .replace('{sessions}', plural(totalSessions(load), words.session))
    .replace('{length}', sessionLength(load.sessionMinutes, words))
    .replace('{perWeek}', String(load.sessionsPerWeek))
    .replace('{weeks}', plural(load.weeks, words.week));

export const isoDuration = (load: CourseLoad): string => {
  const minutes = totalMinutes(load);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours}H${rest ? `${rest}M` : ''}`;
};
