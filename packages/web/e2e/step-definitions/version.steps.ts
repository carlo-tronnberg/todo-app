import { Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Then('I should see the app version in the bottom right corner', async function (this: TodoWorld) {
  const versionEl = this.page.locator('.app-version')
  await expect(versionEl).toBeVisible()
  await expect(versionEl).toContainText(/^v\d+\.\d+\.\d+/)
})
