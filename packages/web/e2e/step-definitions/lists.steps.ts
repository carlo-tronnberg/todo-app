import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Form fields ────────────────────────────────────────────────────────

When('I fill in the list title with {string}', async function (this: TodoWorld, title: string) {
  const modal = this.page.locator('.modal')
  await modal.locator('input.form-input').first().fill(title)
})

When(
  'I fill in the list description with {string}',
  async function (this: TodoWorld, desc: string) {
    const modal = this.page.locator('.modal')
    await modal.locator('input.form-input').nth(1).fill(desc)
  }
)

When('I clear the list title', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await modal.locator('input.form-input').first().clear()
})

When(
  'I select {string} as the default currency',
  async function (this: TodoWorld, currency: string) {
    const modal = this.page.locator('.modal')
    await modal.locator('select.form-input').selectOption(currency)
  }
)

// ── Card actions ───────────────────────────────────────────────────────

When(
  'I click the edit button for {string}',
  async function (this: TodoWorld, listTitle: string) {
    // Reload dashboard so API-created lists are visible
    await this.page.reload()
    await this.page.waitForSelector('.list-card')
    const card = this.page.locator('.list-card', { has: this.page.locator(`.list-title:has-text("${listTitle}")`) })
    await card.locator('.card-action-btn').first().click()
  }
)

When(
  'I click the delete button for {string}',
  async function (this: TodoWorld, listTitle: string) {
    await this.page.reload()
    await this.page.waitForSelector('.list-card')
    const card = this.page.locator('.list-card', { has: this.page.locator(`.list-title:has-text("${listTitle}")`) })
    await card.locator('.card-action-btn--danger').click()
  }
)

When('I click on the list {string}', async function (this: TodoWorld, listTitle: string) {
  await this.page.reload()
  await this.page.waitForSelector('.list-card')
  await this.page.locator(`.list-card-body:has(.list-title:has-text("${listTitle}"))`).click()
})

// ── Assertions ─────────────────────────────────────────────────────────

Then('I should see {string} in the lists', async function (this: TodoWorld, title: string) {
  await expect(this.page.locator(`.list-title:has-text("${title}")`)).toBeVisible()
})

Then('I should not see {string} in the lists', async function (this: TodoWorld, title: string) {
  await expect(this.page.locator(`.list-title:has-text("${title}")`)).not.toBeVisible()
})

Then(
  'I should be on the list detail page for {string}',
  async function (this: TodoWorld, listTitle: string) {
    await this.page.waitForSelector('.list-header')
    expect(this.page.url()).toContain('/lists/')
  }
)

Then(
  'I should see {string} as the list heading',
  async function (this: TodoWorld, title: string) {
    await expect(this.page.locator('.list-header h1')).toContainText(title)
  }
)
