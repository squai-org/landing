/**
 * Correos transaccionales por Brevo. La API key no esta aqui: es el secret
 * BREVO_API_KEY del Worker. Ver docs/bold-checkout.md.
 */
export const email: {
  sender: { name: string; email: string };
  replyTo: { name: string; email: string };
  templates: { confirmation: number | null; recovery: number | null };
  company: { name: string; nit: string; address: string; phone: string; contact: string };
  termsPath: string;
} = {
  /** Remitente verificado en Brevo. */
  sender: { name: 'Squai', email: 'comunicaciones@squai.io' },
  /** Las respuestas del cliente llegan al equipo. */
  replyTo: { name: 'Squai', email: 'team@squai.io' },
  /**
   * Id de cada plantilla en Brevo. El HTML versionado esta en src/emails/; el
   * id lo da Brevo al subirlo (Campanas > Plantillas). Mientras sea null el
   * Worker no envia ni reclama el correo, para no mandar una plantilla
   * equivocada: el cron lo envia cuando el id exista.
   * TODO(equipo): subir src/emails/confirmation.html y src/emails/recovery.html
   * y poner sus ids.
   */
  templates: {
    confirmation: null,
    recovery: null,
  },
  /**
   * Datos de Squai que exige el acuse de recibo (Ley 1480 art. 50). Razon
   * social y NIT son los de los Terminos de Servicio.
   * TODO(equipo): direccion y telefono quedan como placeholders hasta que se
   * confirmen; asi salen en el correo.
   */
  company: {
    name: 'Squai S.A.S.',
    nit: '902.071.792',
    address: '[DIRECCION PENDIENTE]',
    phone: '[TELEFONO PENDIENTE]',
    contact: 'team@squai.io',
  },
  /** Pagina de Terminos de Servicio, donde esta el derecho de retracto. */
  termsPath: '/terminos-de-servicio',
};
