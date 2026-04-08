import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Then(
  'the transaction type dropdown should contain {string}',
  async function (this: TodoWorld, value: string) {
    const modal = this.page.locator('.modal')
    const option = modal.locator(`select:has(option[value="${value}"]) option[value="${value}"]`)
    await expect(option).toBeAttached()
  }
)

When('I select transaction type {string}', async function (this: TodoWorld, value: string) {
  const modal = this.page.locator('.modal')
  const txSelect = modal.locator('.form-col:has(.form-label:has-text("Type")) select.form-input')
  await txSelect.selectOption(value)
})

Then(
  'I should see {string} for item {string}',
  async function (this: TodoWorld, text: string, title: string) {
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${title}")`),
    })
    await expect(item).toContainText(text)
  }
)

Then('I should see {string} on the settings page', async function (this: TodoWorld, text: string) {
  await expect(this.page.locator('.settings-page')).toContainText(text)
})

Then(
  'the transaction type dropdown should be visible in the completion modal',
  async function (this: TodoWorld) {
    const modal = this.page.locator('.modal')
    await expect(modal.locator('select').last()).toBeVisible()
  }
)
