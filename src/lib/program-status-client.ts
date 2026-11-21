import { programStatusLabel } from './program-status';

const SHOWN = 'programStatusShown';

const showProgramStatus = async (element: HTMLElement): Promise<void> => {
  if (element.dataset[SHOWN]) return;
  element.dataset[SHOWN] = 'true';

  const { endpoint, upcoming = '', open = '', closed = '' } = element.dataset;
  const body = await fetch(endpoint ?? '', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  const label = programStatusLabel((body as { program?: { status?: unknown } } | null)?.program?.status, {
    upcoming,
    open,
    closed,
  });

  if (!label) return;
  element.textContent = label;
  element.hidden = false;
};

export const showProgramStatuses = (root: ParentNode = document): void => {
  root.querySelectorAll<HTMLElement>('[data-program-status]').forEach((element) => void showProgramStatus(element));
};
