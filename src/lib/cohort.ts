const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parse = (value: string | null | undefined): Date | null => {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().startsWith(value!) ? date : null;
};

const format = (date: Date, withYear: boolean) =>
  new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(date);

export const formatCohortDates = (startsOn: string | null | undefined, endsOn: string | null | undefined): string | null => {
  const start = parse(startsOn);
  if (!start) return null;

  const end = parse(endsOn);
  if (!end) return `Desde el ${format(start, true)}`;

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `Del ${format(start, !sameYear)} al ${format(end, true)}`;
};
