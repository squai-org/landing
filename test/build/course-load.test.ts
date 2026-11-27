import { describe, expect, it } from 'vitest';
import { courseLoadSummary, durationInHours, isoDuration, sessionLength, totalMinutes, totalSessions } from '../../src/lib/course-load';
const words = {
  summary: '{sessions} de {length}, {perWeek} por semana durante {weeks}',
  halfHour: '{hours} y media',
  hoursAndMinutes: '{hours} y {minutes}',
  session: { one: 'sesión', many: 'sesiones' },
  week: { one: 'semana', many: 'semanas' },
  hour: { one: 'hora', many: 'horas' },
  minute: { one: 'minuto', many: 'minutos' },
};

const squaiOne = { weeks: 4, sessionsPerWeek: 2, sessionMinutes: 150 };

describe('carga del programa', () => {
  it('suma 8 sesiones y 20 horas para 4 semanas de 2 sesiones de 2 horas y media', () => {
    expect(totalSessions(squaiOne)).toBe(8);
    expect(totalMinutes(squaiOne)).toBe(1200);
    expect(durationInHours(squaiOne)).toBe(20);
  });

  it('describe la duracion de una sesion en palabras', () => {
    expect(sessionLength(150, words)).toBe('2 horas y media');
    expect(sessionLength(120, words)).toBe('2 horas');
    expect(sessionLength(60, words)).toBe('1 hora');
    expect(sessionLength(90, words)).toBe('1 hora y media');
    expect(sessionLength(75, words)).toBe('1 hora y 15 minutos');
    expect(sessionLength(45, words)).toBe('45 minutos');
  });

  it('resume la carga para el JSON-LD sin precios ni fechas', () => {
    expect(courseLoadSummary(squaiOne, words)).toBe('8 sesiones de 2 horas y media, 2 por semana durante 4 semanas');
  });

  it('expresa la duracion total en ISO 8601', () => {
    expect(isoDuration(squaiOne)).toBe('PT20H');
    expect(isoDuration({ weeks: 1, sessionsPerWeek: 1, sessionMinutes: 90 })).toBe('PT1H30M');
  });

  it('usa el singular cuando corresponde', () => {
    expect(courseLoadSummary({ weeks: 1, sessionsPerWeek: 1, sessionMinutes: 60 }, words)).toBe(
      '1 sesión de 1 hora, 1 por semana durante 1 semana'
    );
  });
});
