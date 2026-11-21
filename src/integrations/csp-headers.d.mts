export default function cspHeaders(options?: { reportOnly?: boolean }): {
  name: string;
  hooks: {
    'astro:build:done': (args: {
      dir: URL;
      logger: { info: (message: string) => void; warn: (message: string) => void };
    }) => Promise<void>;
  };
};
