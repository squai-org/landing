export interface ProgramBody {
  status?: string;
  prices?: Partial<Record<string, number>>;
  defaultCurrency?: string;
  startsOn?: string | null;
  endsOn?: string | null;
  schedule?: string | null;
}

const requests = new Map<string, Promise<ProgramBody | null>>();

const request = (endpoint: string): Promise<ProgramBody | null> =>
  fetch(endpoint, { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => (body as { program?: ProgramBody } | null)?.program ?? null)
    .catch(() => null);

export const fetchProgram = (endpoint: string): Promise<ProgramBody | null> => {
  const pending = requests.get(endpoint) ?? request(endpoint);
  requests.set(endpoint, pending);
  return pending;
};
