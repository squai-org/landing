export type Amounts = Partial<Record<string, number>>;

export const discountedReference = (reference: Amounts, current: Amounts, currency: string): number | undefined => {
  const listed = reference[currency];
  const charged = current[currency];
  return listed !== undefined && charged !== undefined && charged < listed ? listed : undefined;
};

export const fillTemplate = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
