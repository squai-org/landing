/**
 * Firma de integridad del Boton de pagos de Bold.
 *
 * Bold exige SHA-256 sobre {Identificador}{Monto}{Divisa}{LlaveSecreta}
 * concatenados sin separadores, en ese orden, y devuelto en hexadecimal.
 * El calculo vive en el Worker porque la llave secreta no puede salir del
 * servidor: si el navegador firmara, cualquiera podria cambiar el monto.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
 */

const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'));

const toHex = (buffer: ArrayBuffer) => {
  let out = '';
  for (const byte of new Uint8Array(buffer)) out += HEX[byte];
  return out;
};

export interface IntegritySignatureInput {
  orderId: string;
  amount: number;
  currency: string;
  secretKey: string;
}

export const boldIntegritySignature = async ({
  orderId,
  amount,
  currency,
  secretKey,
}: IntegritySignatureInput): Promise<string> => {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`El monto de Bold debe ser un entero no negativo, se recibio ${amount}.`);
  }

  const payload = new TextEncoder().encode(`${orderId}${amount}${currency}${secretKey}`);
  return toHex(await crypto.subtle.digest('SHA-256', payload));
};

/**
 * Verifica la cabecera x-bold-signature de una notificacion de webhook.
 *
 * Bold firma el base64 del cuerpo crudo con HMAC-SHA256 y la llave secreta, y
 * entrega el resultado en hexadecimal. Hay que verificar sobre el cuerpo tal
 * como llego: volver a serializar el JSON cambia los bytes y la firma deja de
 * cuadrar. https://developers.bold.co/webhook
 *
 * La comparacion se delega a crypto.subtle.verify, que compara en tiempo
 * constante. workerd no expone timingSafeEqual.
 */
const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let latin1 = '';
  // Por trozos: String.fromCharCode(...bytes) desborda la pila con cuerpos grandes.
  for (let i = 0; i < bytes.length; i += 4096) {
    latin1 += String.fromCharCode(...bytes.subarray(i, i + 4096));
  }
  return btoa(latin1);
};

const fromHex = (hex: string): Uint8Array | null => {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
};

export const verifyBoldWebhookSignature = async (
  secretKey: string,
  rawBody: string,
  signature: string | undefined | null
): Promise<boolean> => {
  if (!signature) return false;

  const expected = fromHex(signature.trim());
  // SHA-256 son 32 bytes: una firma de otro tamano no puede ser valida y
  // crypto.subtle.verify la rechazaria igual, pero asi no se importa la llave.
  if (!expected || expected.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify('HMAC', key, expected, new TextEncoder().encode(toBase64(rawBody)));
};
