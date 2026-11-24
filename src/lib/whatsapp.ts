const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS ? digits : null;
}

export interface WhatsappTopic {
  label: string;
  message: string;
}

export interface WhatsappPanel {
  dialogLabel: string;
  title: string;
  subtitle: string;
  close: string;
  topics: WhatsappTopic[];
}

export interface WhatsappConfig {
  label: string;
  message: string;
  tooltip?: string;
  panel?: WhatsappPanel;
}

export interface WhatsappOverride {
  label?: string;
  message?: string;
  tooltip?: string;
  panel?: Partial<WhatsappPanel>;
}

export function whatsappUrl(phone: string, message?: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const text = message?.trim();
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function resolveWhatsappConfig(base: WhatsappConfig, override?: WhatsappOverride): WhatsappConfig {
  if (!override) return base;

  const panel =
    base.panel || override.panel
      ? {
          dialogLabel: override.panel?.dialogLabel ?? base.panel?.dialogLabel ?? '',
          title: override.panel?.title ?? base.panel?.title ?? '',
          subtitle: override.panel?.subtitle ?? base.panel?.subtitle ?? '',
          close: override.panel?.close ?? base.panel?.close ?? '',
          topics: override.panel?.topics ?? base.panel?.topics ?? [],
        }
      : undefined;

  return {
    label: override.label ?? base.label,
    message: override.message ?? base.message,
    tooltip: override.tooltip ?? base.tooltip,
    panel,
  };
}
