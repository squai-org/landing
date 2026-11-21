export const email: {
  sender: { name: string; email: string };
  replyTo: { name: string; email: string };
  templates: { confirmation: number | null; recovery: number | null };
} = {
  sender: { name: 'Squai', email: 'comunicaciones@squai.io' },
  replyTo: { name: 'Squai', email: 'team@squai.io' },
  templates: {
    confirmation: 1,
    recovery: 4,
  },
};
