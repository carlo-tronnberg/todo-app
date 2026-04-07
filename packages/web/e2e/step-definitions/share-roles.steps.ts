import { Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Then('I should see a role selector in the share form', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await expect(modal.locator('select')).toBeVisible()
})

Then('the profile menu should contain {string}', async function (this: TodoWorld, text: string) {
  await this.page.locator('.avatar-btn').click()
  await expect(this.page.locator('.avatar-dropdown')).toContainText(text)
})
