import { fetchProgram } from './program-client';
import { programStatusLabel } from './program-status';

const SHOWN = 'programStatusShown';

const showProgramStatus = async (element: HTMLElement): Promise<void> => {
  if (element.dataset[SHOWN]) return;
  element.dataset[SHOWN] = 'true';

  const { endpoint, upcoming = '', open = '', closed = '' } = element.dataset;
  const program = await fetchProgram(endpoint ?? '');

  const label = programStatusLabel(program?.status, { upcoming, open, closed });

  if (!label) return;
  element.textContent = label;
  element.hidden = false;
};

export const showProgramStatuses = (root: ParentNode = document): void => {
  root.querySelectorAll<HTMLElement>('[data-program-status]').forEach((element) => void showProgramStatus(element));
};
