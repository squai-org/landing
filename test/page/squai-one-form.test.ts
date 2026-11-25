import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const readDist = async (file: string) => {
  try {
    return await readFile(path.join(dist, file), 'utf8');
  } catch {
    throw new Error(`Falta dist/${file}: ejecuta pnpm build antes de pnpm test:dist`);
  }
};

const closingIndex = (html: string, start: number, tag: string) => {
  const token = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  token.lastIndex = start;
  let depth = 0;
  for (let match = token.exec(html); match; match = token.exec(html)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  throw new Error(`Sin cierre para <${tag}> en ${start}`);
};

const enclosingElement = (html: string, marker: string, tag: string) => {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) throw new Error(`Sin ${marker} en el HTML`);
  const start = html.lastIndexOf(`<${tag}`, markerIndex);
  return html.slice(start, closingIndex(html, start, tag));
};

const openingTags = (fragment: string, tag: string) => fragment.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];

const firstTag = (fragment: string, tag: string) => {
  const [found] = openingTags(fragment, tag);
  if (!found) throw new Error(`Sin etiqueta <${tag}> en el fragmento`);
  return found;
};

const attribute = (tag: string, name: string) => {
  const match = new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`).exec(tag);
  return match ? (match[1] ?? '') : undefined;
};

const hasAttribute = (fragment: string, name: string) => new RegExp(`\\s${name}(?=[=\\s>/])`).test(fragment);

const submitButtons = (fragment: string) => openingTags(fragment, 'button').filter((tag) => attribute(tag, 'type') === 'submit');

const customSelectAttributes = [
  'data-select-name',
  'data-select-required',
  'data-select-message',
  'data-select-trigger',
  'data-select-trigger-label',
  'data-select-value',
  'data-select-panel',
  'data-select-option',
];

const countrySelectAttributes = [
  'data-country-select',
  'data-country-trigger',
  'data-country-trigger-label',
  'data-country-value',
  'data-country-panel',
  'data-country-search',
  'data-country-list',
];

describe('pagina de Squai One: contrato del formulario', () => {
  let page: string;
  let container: string;
  let form: string;

  beforeAll(async () => {
    page = await readDist('servicios/squai-one.html');
    container = enclosingElement(page, 'data-bold-checkout', 'div');
    form = enclosingElement(page, 'id="checkout-form"', 'form');
  });

  it('el formulario cuelga del contenedor del checkout con sus endpoints', () => {
    const containerTag = firstTag(container, 'div');
    const formTag = firstTag(form, 'form');

    expect(container).toContain(formTag);
    expect(attribute(formTag, 'id')).toBe('checkout-form');
    expect(attribute(formTag, 'data-form')).toBe('checkout');
    expect(attribute(formTag, 'data-endpoint')).toMatch(/^\/api\//);
    expect(attribute(formTag, 'novalidate')).toBe('');
    expect(attribute(containerTag, 'data-program')).toBe('squai-one');
    for (const name of ['data-program-endpoint', 'data-status-endpoint', 'data-library-url', 'data-return-path']) {
      expect(attribute(containerTag, name), name).toBeTruthy();
    }
  });

  it('los campos llevan placeholders del diseno y la nota de pago seguro sigue al boton', () => {
    const placeholder = (id: string) => attribute(openingTags(form, 'input').find((tag) => attribute(tag, 'id') === id)!, 'placeholder');

    expect(placeholder('checkout-full-name')).toBe('Ej. Laura Gómez');
    expect(placeholder('checkout-email')).toBe('laura@tuempresa.com');
    expect(placeholder('checkout-phone')).toBe('300 000 0000');

    const submitPanel = enclosingElement(form, 'data-sales-panel="form"', 'div');
    expect(submitPanel).toContain('Pago seguro en línea · Confirmación por correo');
    expect(submitPanel).toContain('<svg');
  });

  it('no repite la fila de precio del diseno', () => {
    expect(page).not.toContain('Valor del programa');
  });

  it('tiene exactamente los campos de produccion', () => {
    const names = openingTags(form, 'input')
      .filter((tag) => attribute(tag, 'type') !== 'radio' && attribute(tag, 'name') !== undefined)
      .map((tag) => attribute(tag, 'name'))
      .sort();

    expect(names).toEqual(
      ['country_code', 'email', 'full_name', 'phone', 'privacy_consent', 'program', 'referral_source', 'terms_consent'].sort(),
    );
  });

  it('cada campo visible tiene su mensaje de error', () => {
    const errors = openingTags(form, '[a-z]+').map((tag) => attribute(tag, 'data-field-error'));

    for (const name of ['full_name', 'email', 'country_code', 'phone', 'referral_source', 'terms_consent', 'privacy_consent']) {
      expect(errors, name).toContain(name);
    }
  });

  it('el telefono tiene una sola etiqueta visible y el indicativo conserva su nombre accesible', () => {
    const labelTags = openingTags(form, 'span').filter((tag) => attribute(tag, 'class') === 'field-label');
    const visibleText = form.replace(/<[^>]+>/g, ' ');

    expect(visibleText.match(/Teléfono o WhatsApp/g)).toHaveLength(1);
    expect(form).toMatch(/Teléfono o WhatsApp\s*<span aria-hidden="true"[^>]*>\*<\/span>/);
    expect(visibleText).not.toContain('Número de teléfono');
    expect(labelTags.some((tag) => attribute(tag, 'id') === 'checkout-country-code-label')).toBe(false);
    const countryLabel = openingTags(form, 'span').find((tag) => attribute(tag, 'id') === 'checkout-country-code-label')!;
    expect(attribute(countryLabel, 'class')).toBe('sr-only');
    expect(form).toMatch(/id="checkout-country-code-label"[^>]*>\s*Indicativo/);
  });

  it('como descubriste es opcional y lo dice', () => {
    const referral = enclosingElement(form, 'data-select-name="referral_source"', 'div');

    expect(hasAttribute(referral, 'data-select-required')).toBe(false);
    expect(referral).not.toMatch(/aria-hidden="true"[^>]*>\*/);
    expect(referral).toContain('(opcional)');
  });

  it('los checks de terminos y privacidad van antes que el Turnstile dentro del mismo grupo', () => {
    const group = enclosingElement(form, 'data-consent-row', 'div');
    const terms = group.indexOf('name="terms_consent"');
    const privacy = group.indexOf('name="privacy_consent"');
    const widget = group.indexOf('turnstile-wrap');

    expect(terms).toBeGreaterThan(-1);
    expect(privacy).toBeGreaterThan(terms);
    if (widget !== -1) expect(widget).toBeGreaterThan(privacy);
    expect(form.indexOf('data-consent-row')).toBeLessThan(form.indexOf('data-sales-panel="form"'));
  });

  it('el Precio de referencia esta en la misma linea del Precio vigente y el descuento debajo', () => {
    const group = enclosingElement(page, 'class="checkout-price-group"', 'div');
    const price = group.indexOf('checkout-price-line');
    const reference = group.indexOf('checkout-reference-line');
    const discount = group.indexOf('checkout-discount-line');

    expect(price).toBeGreaterThan(-1);
    expect(reference).toBeGreaterThan(price);
    expect(discount).toBeGreaterThan(reference);
  });

  it('las filas de campos son nombre con correo y telefono con como descubriste', () => {
    const rows = [...form.matchAll(/class="one-signup-row"/g)].map((match) => match.index!);

    expect(rows).toHaveLength(2);
    const first = form.slice(rows[0]!, rows[1]);
    const second = form.slice(rows[1]);
    expect(first.indexOf('name="full_name"')).toBeGreaterThan(-1);
    expect(first.indexOf('name="email"')).toBeGreaterThan(first.indexOf('name="full_name"'));
    expect(first).not.toContain('name="phone"');
    expect(second.indexOf('name="phone"')).toBeGreaterThan(-1);
    expect(second.indexOf('name="referral_source"')).toBeGreaterThan(second.indexOf('name="phone"'));
  });

  it('Campos obligatorios acompana al titulo de la tarjeta', () => {
    const heading = enclosingElement(container, 'checkout-card-heading', 'div');

    expect(heading).toContain('Campos obligatorios');
    expect(form).not.toContain('Campos obligatorios');
  });

  it('tiene un unico boton de envio con su etiqueta', () => {
    const submits = submitButtons(form);

    expect(submits).toHaveLength(1);
    const submit = enclosingElement(form, submits[0]!, 'button');
    expect(submit).toMatch(/class="[^"]*\bbtn-label\b[^"]*"/);
    expect(attribute(submits[0]!, 'class')).toContain('btn-primary');
  });

  it('las casillas de terminos y privacidad son del formulario', () => {
    const checkboxes = openingTags(form, 'input').filter((tag) => attribute(tag, 'type') === 'checkbox');

    expect(checkboxes.map((tag) => attribute(tag, 'name')).sort()).toEqual(['privacy_consent', 'terms_consent']);
  });

  it('el selector de moneda enlaza sus radios con el formulario', () => {
    const picker = enclosingElement(page, ' data-currency-picker', 'fieldset');
    const radios = openingTags(picker, 'input');

    expect(radios.map((tag) => attribute(tag, 'value'))).toEqual(['COP', 'USD']);
    for (const radio of radios) {
      expect(attribute(radio, 'name')).toBe('currency');
      expect(attribute(radio, 'form')).toBe('checkout-form');
    }
    expect(picker.match(/data-currency-option/g)).toHaveLength(2);
    expect(page.match(/data-bold-price/g)).toHaveLength(1);
    expect(page.match(/data-bold-currency/g)).toHaveLength(1);
  });

  it('los paneles de venta cubren el formulario, lo proximo y lo cerrado', () => {
    const panels = openingTags(container, 'div').map((tag) => attribute(tag, 'data-sales-panel')).filter(Boolean);
    const formPanel = enclosingElement(container, 'data-sales-panel="form"', 'div');

    expect(panels.sort()).toEqual(['closed', 'form', 'upcoming']);
    expect(submitButtons(formPanel)).toHaveLength(1);
  });

  it('el estado del formulario se anuncia a los lectores de pantalla', () => {
    const status = openingTags(container, 'div').find((tag) => hasAttribute(tag, 'data-form-status'));

    expect(status).toBeDefined();
    expect(attribute(status!, 'role')).toBe('status');
    expect(attribute(status!, 'aria-live')).toBe('polite');
  });

  it('el ancla de inscripcion existe una vez y la usan los enlaces', () => {
    expect(page.match(/\sid="inscripcion"/g)).toHaveLength(1);
    expect(page).toMatch(/(?:href="[^"]*#inscripcion"|data-scroll-to="inscripcion")/);
  });

  it('cada selector personalizado conserva sus atributos de comportamiento', () => {
    const referral = enclosingElement(form, 'data-select-name="referral_source"', 'div');
    const country = enclosingElement(form, 'data-country-select', 'div');

    for (const name of customSelectAttributes.filter((attributeName) => attributeName !== 'data-select-required')) expect(hasAttribute(referral, name), `referral_source ${name}`).toBe(true);
    for (const name of countrySelectAttributes) expect(hasAttribute(country, name), `country_code ${name}`).toBe(true);
    expect(attribute(firstTag(referral, 'div'), 'data-custom-select')).toBe('');
    expect(openingTags(referral, 'button').filter((tag) => hasAttribute(tag, 'data-select-option'))).not.toHaveLength(0);
  });

  it('mantiene la regla global que oculta lo marcado con hidden', async () => {
    const assets = await readdir(path.join(dist, '_astro'));
    const styles = [page, ...(await Promise.all(assets.filter((file) => file.endsWith('.css')).map((file) => readDist(`_astro/${file}`))))];

    expect(styles.some((css) => /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css))).toBe(true);
  });
});
