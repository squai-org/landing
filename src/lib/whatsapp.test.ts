import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWhatsappConfig, whatsappUrl, type WhatsappConfig } from './whatsapp';

const base: WhatsappConfig = {
  label: 'Escríbenos por WhatsApp',
  message: 'Hola Squai',
  panel: {
    dialogLabel: 'Asistencia rápida',
    title: 'Chatea con Squai',
    subtitle: 'Sin bots',
    close: 'Cerrar',
    topics: [{ label: 'Tema general', message: 'Hola general' }],
  },
};

test('resolveWhatsappConfig returns base untouched when override is absent', () => {
  assert.deepEqual(resolveWhatsappConfig(base), base);
});

test('resolveWhatsappConfig merges service overrides without mutating base', () => {
  const resolved = resolveWhatsappConfig(base, {
    message: 'Hola Squai One',
    tooltip: '¿Dudas antes de inscribirte?',
    panel: {
      title: '¿Dudas antes de inscribirte?',
      subtitle: 'Te respondemos nosotros, sin bots.',
      topics: [{ label: '¿Esto aplica para mi trabajo?', message: 'Hola trabajo' }],
    },
  });

  assert.equal(resolved.label, base.label);
  assert.equal(resolved.message, 'Hola Squai One');
  assert.equal(resolved.tooltip, '¿Dudas antes de inscribirte?');
  assert.equal(resolved.panel?.dialogLabel, base.panel?.dialogLabel);
  assert.equal(resolved.panel?.title, '¿Dudas antes de inscribirte?');
  assert.equal(resolved.panel?.subtitle, 'Te respondemos nosotros, sin bots.');
  assert.equal(resolved.panel?.close, base.panel?.close);
  assert.deepEqual(resolved.panel?.topics, [{ label: '¿Esto aplica para mi trabajo?', message: 'Hola trabajo' }]);
});

test('whatsappUrl builds encoded wa.me URL for valid phone numbers', () => {
  assert.equal(
    whatsappUrl('+57 314 380 2400', 'Hola Squai One'),
    'https://wa.me/573143802400?text=Hola%20Squai%20One'
  );
  assert.equal(whatsappUrl('123'), null);
});
