/**
 * Página de reservas (appointment schedule) de team@squai.io, con la que el
 * visitante agenda solo su llamada de diagnóstico.
 *
 * Las dos URL salen del propio Google Calendar (Booking pages → Options →
 * Sharing options → Website embed). No se construyen a mano ni se les añaden
 * parámetros: cualquier cambio tiene que venir de volver a copiar el código
 * que genera Calendar.
 * https://support.google.com/calendar/answer/10733297
 */
export const booking = {
  /** URL incrustable de la página de reservas. `gv=true` viene en el código de Google. */
  embedUrl:
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ28w9xJ7DY2IZhs11K0URB7rBzveURcS1436hw9RJXz5EhcWgd02nW3Meu1u_3UkQ5HPeBkUs-a?gv=true',
  /** Enlace corto de la misma página, para abrirla fuera del iframe. */
  shortUrl: 'https://calendar.app.google/452SASMWk75es73W6',
};
