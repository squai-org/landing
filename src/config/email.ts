/**
 * Correos transaccionales por Brevo. La API key no esta aqui: es el secret
 * BREVO_API_KEY del Worker. Los textos del correo y los datos de Squai del
 * acuse de recibo son contenido (src/content/copies.json: company y
 * ui.checkout.confirmationEmail). Ver docs/bold-checkout.md.
 */
export const email: {
  sender: { name: string; email: string };
  replyTo: { name: string; email: string };
  templates: { confirmation: number | null; recovery: number | null };
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
};
