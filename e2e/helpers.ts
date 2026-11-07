import { Page } from '@playwright/test';

export async function enterAnonymousMode(page: Page) {
  await page.getByRole('button', { name: /try without/i }).click();
}

// Schedule step of the program wizards: "Every 1 days", so the program has a card
// on every day. (Flexible has no recurrence: it is started from New workout, #43.)
export async function scheduleEveryDay(page: Page) {
  await page.getByText('Every X days').click();
  await page.getByLabel(/Practice every/).fill('1');
}

// Starts a program today from the New workout picker (ad hoc)
export async function startNow(page: Page, programName: string) {
  await page.getByRole('button', { name: 'New workout' }).click();
  await page.getByRole('button', { name: `Start ${programName} now` }).click();
}
