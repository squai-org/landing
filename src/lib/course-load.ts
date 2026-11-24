export interface CourseLoad {
  weeks: number;
  sessionsPerWeek: number;
  sessionMinutes: number;
}

const plural = (count: number, singular: string, many: string) => `${count} ${count === 1 ? singular : many}`;

export const totalSessions = ({ weeks, sessionsPerWeek }: CourseLoad) => weeks * sessionsPerWeek;

export const totalMinutes = (load: CourseLoad) => totalSessions(load) * load.sessionMinutes;

export const durationInHours = (load: CourseLoad) => totalMinutes(load) / 60;

export const sessionLength = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return plural(rest, 'minuto', 'minutos');
  if (rest === 0) return plural(hours, 'hora', 'horas');
  if (rest === 30) return `${plural(hours, 'hora', 'horas')} y media`;
  return `${plural(hours, 'hora', 'horas')} y ${plural(rest, 'minuto', 'minutos')}`;
};

export const courseLoadSummary = (load: CourseLoad): string =>
  `${plural(totalSessions(load), 'sesión', 'sesiones')} de ${sessionLength(load.sessionMinutes)}, ${load.sessionsPerWeek} por semana durante ${plural(load.weeks, 'semana', 'semanas')}`;

export const isoDuration = (load: CourseLoad): string => {
  const minutes = totalMinutes(load);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours}H${rest ? `${rest}M` : ''}`;
};
