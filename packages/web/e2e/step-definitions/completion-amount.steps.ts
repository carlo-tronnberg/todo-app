import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Given(
  'I have a list called {string} with default currency {string}',
  async function (this: TodoWorld, title: string, currency: string) {
    await this.createListViaApi(title, { defaultCurrency: currency })
  }
)

Then(
  'the amount field in the completion modal should be focused',
  async function (this: TodoWorld) {
    const modal = this.page.locator('.modal')
    const amountInput = modal.locator('.completion-amount input[type="number"]')
    await expect(amountInput).toBeFocused()
  }
)

Then(
  'the currency select in the completion modal should show {string}',
  async function (this: TodoWorld, currency: string) {
    const modal = this.page.locator('.modal')
    const currencySelect = modal.locator('.completion-amount select')
    await expect(currencySelect).toHaveValue(currency)
  }
)

When('I enter the completion amount {string}', async function (this: TodoWorld, amount: string) {
  const modal = this.page.locator('.modal')
  await modal.locator('.completion-amount input[type="number"]').fill(amount)
})

Then(
  '{string} should still appear in the items list',
  async function (this: TodoWorld, title: string) {
    await expect(this.page.locator(`.todo-title:has-text("${title}")`)).toBeVisible()
  }
)

When('I press Tab in the completion amount field', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await modal.locator('.completion-amount input[type="number"]').press('Tab')
})

Then('the completion note field should be focused', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await expect(modal.locator('textarea.form-input')).toBeVisible()
})

Given(
  'I have an item with amount {string} and currency {string} called {string} in list {string}',
  async function (
    this: TodoWorld,
    amount: string,
    currency: string,
    title: string,
    listTitle: string
  ) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    await this.createItemViaApi(listTitle, { title, amount: parseFloat(amount), currency })
  }
)

Then(
  'the completion amount field should contain {string}',
  async function (this: TodoWorld, expected: string) {
    const modal = this.page.locator('.modal')
    await expect(modal.locator('.completion-amount input[type="number"]')).toHaveValue(expected)
  }
)
