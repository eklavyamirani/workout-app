import { Page } from '@playwright/test';

export async function enterAnonymousMode(page: Page) {
  await page.getByRole('button', { name: /try without/i }).click();
}
