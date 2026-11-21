import { describe, expect, it } from 'vitest';
import { normalizePhone, whatsappUrl } from '../../src/lib/whatsapp';

describe('normalizePhone', () => {
  it('deja solo los dígitos de un número con formato', () => {
    expect(normalizePhone('+57 300 123 4567')).toBe('573001234567');
    expect(normalizePhone('(+57) 300-123-4567')).toBe('573001234567');
  });

  it('trata el texto de relleno y el vacío como ausencia de número', () => {
    expect(normalizePhone('[TELEFONO PENDIENTE]')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('rechaza números demasiado cortos o más largos que E.164', () => {
    expect(normalizePhone('300 1234')).toBeNull();
    expect(normalizePhone('1234567890123456')).toBeNull();
  });
});

describe('whatsappUrl', () => {
  it('apunta a wa.me con los dígitos del teléfono', () => {
    expect(whatsappUrl('+57 300 123 4567')).toBe('https://wa.me/573001234567');
  });

  it('precarga el mensaje codificado', () => {
    expect(whatsappUrl('+573001234567', 'Hola Squai, ¿qué tal?')).toBe(
      'https://wa.me/573001234567?text=Hola%20Squai%2C%20%C2%BFqu%C3%A9%20tal%3F',
    );
  });

  it('omite el mensaje si está en blanco', () => {
    expect(whatsappUrl('+573001234567', '  ')).toBe('https://wa.me/573001234567');
  });

  it('devuelve null sin número real', () => {
    expect(whatsappUrl('[TELEFONO PENDIENTE]', 'Hola')).toBeNull();
  });
});
