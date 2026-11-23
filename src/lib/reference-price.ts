export type Amounts = Partial<Record<string, number>>;

export const discountedReference = (reference: Amounts, current: Amounts, currency: string): number | undefined => {
  const listed = reference[currency];
  const charged = current[currency];
  return listed !== undefined && charged !== undefined && charged < listed ? listed : undefined;
};
