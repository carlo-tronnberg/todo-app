import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

When('I click on an audit entry for {string}', async function (this: TodoWorld, itemTitle: string) {
  const row = this.page.locator(`tr:has-text("${itemTitle}")`)
  await row.first().click()
})

Then('I should see the item detail modal', async function (this: TodoWorld) {
  await expect(this.page.locator('.modal[aria-label="Item Detail"]')).toBeVisible()
})

Then(
  'I should see {string} in the item detail modal',
  async function (this: TodoWorld, text: string) {
    const modal = this.page.locator('.modal[aria-label="Item Detail"]')
    await expect(modal).toContainText(text)
  }
)
