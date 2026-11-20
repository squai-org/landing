# D1 es la fuente de verdad; Brevo solo transporta correos

Clientes, órdenes, precios, límites del programa y el registro de cada correo enviado (incluido el `templateId` usado) viven en D1. Brevo se usa únicamente para enviar correos transaccionales con plantillas, y el HTML de esas plantillas se versiona en este repositorio; Brevo guarda una copia.

Se descartó sincronizar clientes como contactos de Brevo y usar sus automatizaciones (seguimiento de quien no paga, segmentos) aunque ahorraba código: las automatizaciones exigen un plan de pago, y depender de los datos de Brevo para el seguimiento comercial retiene la información en un proveedor y presiona a pagar una suscripción. El correo de recuperación y los reintentos los dispara un cron del Worker por esa razón.
