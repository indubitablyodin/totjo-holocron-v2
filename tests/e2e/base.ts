import { expect, test as base } from '@playwright/test';

const ANNOUNCEMENTS_URL = '**/totjo-holocron-announcements/announcements.json';

export const test = base.extend({
  context: async ({ context }, run) => {
    await context.route(
      ANNOUNCEMENTS_URL,
      (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await run(context);
  },
});

export { expect };