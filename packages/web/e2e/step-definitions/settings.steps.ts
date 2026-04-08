import { Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

When('I navigate to the settings page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/settings`)
  await this.page.waitForSelector('h1', { timeout: 10_000 })
})

async function openAvatarDropdown(page: import('playwright').Page) {
  const dropdown = page.locator('.avatar-dropdown')
  if (!(await dropdown.isVisible().catch(() => false))) {
    await page.locator('.avatar-btn').click()
  }
}

Then('I should see the settings icon in the navigation', async function (this: TodoWorld) {
  await openAvatarDropdown(this.page)
  await expect(this.page.locator('a.dropdown-item[href*="settings"]')).toBeVisible()
})

When('I click the settings icon', async function (this: TodoWorld) {
  await openAvatarDropdown(this.page)
  await this.page.locator('a.dropdown-item[href*="settings"]').click()
  await this.page.waitForSelector('h1', { timeout: 10_000 })
})
