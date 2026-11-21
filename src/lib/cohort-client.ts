import { formatCohortDates } from './cohort';
import { fetchProgram } from './program-client';

const fill = (root: ParentNode, selector: string, value: string | null | undefined): void => {
  if (!value) return;
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = value;
    element.dataset.cohortKnown = 'true';
  });
};

export const showCohort = async (root: ParentNode = document): Promise<void> => {
  const endpoint = root.querySelector<HTMLElement>('[data-cohort-endpoint]')?.dataset.cohortEndpoint;
  if (!endpoint) return;

  const program = await fetchProgram(endpoint);
  if (!program) return;

  fill(root, '[data-cohort-dates]', formatCohortDates(program.startsOn, program.endsOn));
  fill(root, '[data-cohort-schedule]', program.schedule?.trim());
};
