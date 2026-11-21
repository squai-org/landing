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

const elementAt = (html: string, start: number, tag: string) => html.slice(start, closingIndex(html, start, tag));

const openingTags = (fragment: string, tag: string) => fragment.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];

const attribute = (tag: string, name: string) => new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`).exec(tag)?.[1] ?? (new RegExp(`\\s${name}(?=[\\s>/])`).test(tag) ? '' : undefined);

const firstTag = (fragment: string, tag: string) => {
  const [found] = openingTags(fragment, tag);
  if (!found) throw new Error(`Sin etiqueta <${tag}> en el fragmento`);
  return found;
};

const hasAttribute = (fragment: string, name: string) => new RegExp(`\\s${name}(?:=|\\s|>|/)`).test(fragment);

describe('pagina de Squai One: contrato del formulario', () => {
  let page: string;
  let container: string;
  let form: string;

  beforeAll(async () => {
    page = await readDist('servicios/squai-one.html');
    const containerStart = page.lastIndexOf('<div', page.indexOf('data-bold-checkout'));
    container = elementAt(page, containerStart, 'div');
    const formStart = page.indexOf('<form', page.indexOf('id="checkout-form"') - 40);
    form = page.slice(formStart, page.indexOf('</form>', formStart) + 7);
  });

  it('el formulario cuelga del contenedor del checkout con sus endpoints', () => {
    const containerTag = firstTag(container, 'div');
    const formTag = firstTag(form, 'form');

    expect(container).toContain(formTag);
    expect(attribute(formTag, 'id')).toBe('checkout-form');
    expect(attribute(formTag, 'data-form')).toBe('checkout');
    expect(attribute(formTag, 'data-endpoint')).toMatch(/^\/api\//);
    expect(hasAttribute(formTag, 'novalidate')).toBe(true);
    expect(attribute(containerTag, 'data-program')).toBe('squai-one');
    for (const name of ['data-program-endpoint', 'data-status-endpoint', 'data-library-url', 'data-return-path']) {
      expect(attribute(containerTag, name), name).toBeTruthy();
    }
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

  it('tiene un unico boton de envio con su etiqueta', () => {
    const submits = openingTags(form, 'button').filter((tag) => attribute(tag, 'type') === 'submit');
    const submitStart = form.indexOf(submits[0]!);
    const submit = elementAt(form, submitStart, 'button');

    expect(submits).toHaveLength(1);
    expect(submit).toMatch(/class="[^"]*\bbtn-label\b[^"]*"/);
    expect(attribute(submits[0]!, 'class')).toContain('btn-primary');
  });

  it('las casillas de terminos y privacidad son del formulario', () => {
    const checkboxes = openingTags(form, 'input').filter((tag) => attribute(tag, 'type') === 'checkbox');

    expect(checkboxes.map((tag) => attribute(tag, 'name')).sort()).toEqual(['privacy_consent', 'terms_consent']);
  });

  it('el selector de moneda enlaza sus radios con el formulario', () => {
    const pickerStart = page.lastIndexOf('<', page.indexOf('data-currency-picker'));
    const picker = elementAt(page, pickerStart, page.slice(pickerStart + 1).match(/^[a-z0-9]+/i)![0]);
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
    const formPanelStart = container.lastIndexOf('<div', container.indexOf('data-sales-panel="form"'));
    const formPanel = elementAt(container, formPanelStart, 'div');

    expect(panels.sort()).toEqual(['closed', 'form', 'upcoming']);
    expect(openingTags(formPanel, 'button').filter((tag) => attribute(tag, 'type') === 'submit')).toHaveLength(1);
  });

  it('el estado del formulario se anuncia a los lectores de pantalla', () => {
    const [status] = openingTags(container, 'div').filter((tag) => hasAttribute(tag, 'data-form-status'));

    expect(status).toBeDefined();
    expect(attribute(status!, 'role')).toBe('status');
    expect(attribute(status!, 'aria-live')).toBe('polite');
  });

  it('el ancla de inscripcion existe una vez y la usan los enlaces', () => {
    expect(page.match(/\sid="inscripcion"/g)).toHaveLength(1);
    expect(page).toMatch(/(?:href="[^"]*#inscripcion"|data-scroll-to="inscripcion")/);
  });

  it('los selectores personalizados conservan sus atributos de comportamiento', () => {
    for (const name of [
      'data-custom-select',
      'data-select-name',
      'data-select-trigger',
      'data-select-trigger-label',
      'data-select-value',
      'data-select-panel',
      'data-select-option',
      'data-country-trigger',
      'data-country-trigger-label',
      'data-country-value',
      'data-country-panel',
      'data-country-search',
      'data-country-list',
    ]) {
      expect(hasAttribute(form, name), name).toBe(true);
    }
  });

  it('Turnstile, si se renderiza, queda dentro del formulario', () => {
    if (!hasAttribute(page, 'data-turnstile-widget')) return;

    expect(hasAttribute(form, 'data-turnstile-widget')).toBe(true);
  });

  it('mantiene la regla global que oculta lo marcado con hidden', async () => {
    const assets = await readdir(path.join(dist, '_astro'));
    const styles = [page, ...(await Promise.all(assets.filter((file) => file.endsWith('.css')).map((file) => readDist(`_astro/${file}`))))];

    expect(styles.some((css) => /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css))).toBe(true);
  });
});
