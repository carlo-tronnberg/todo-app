import { Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Then('I should see the settings icon in the navigation', async function (this: TodoWorld) {
  await expect(this.page.locator('a[href="/settings"]')).toBeVisible()
})

When('I click the settings icon', async function (this: TodoWorld) {
  await this.page.locator('a[href="/settings"]').click()
  await this.page.waitForSelector('h1', { timeout: 10_000 })
})
