import { Page } from '@playwright/test';

export async function enterAnonymousMode(page: Page) {
  await page.getByRole('button', { name: /try without/i }).click();
}

// Finish asks how hard the workout was; rate it, or finish without a rating
export async function finishWorkout(page: Page, effort?: number) {
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: effort ? `Effort ${effort}` : 'Finish without rating' }).click();
}
