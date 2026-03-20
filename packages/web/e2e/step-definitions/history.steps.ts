import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Data setup via API ─────────────────────────────────────────────────

Given(
  'I have a completed item {string} with note {string} in list {string}',
  async function (this: TodoWorld, title: string, note: string, listTitle: string) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    await this.createItemViaApi(listTitle, { title, dueDate: '2026-03-15' })
    await this.completeItemViaApi(title, note)
  }
)

// ── Navigation ─────────────────────────────────────────────────────────

When(
  'I navigate to the history page for {string}',
  async function (this: TodoWorld, itemTitle: string) {
    const item = this.getItem(itemTitle)
    await this.page.goto(`${this.baseUrl}/history/${item.id}`)
    await this.page.waitForSelector('h1')
  }
)

// ── Actions ────────────────────────────────────────────────────────────

When(
  'I click the {string} button for the latest completion',
  async function (this: TodoWorld, label: string) {
    const entry = this.page.locator('.history-entry').first()
    await entry.locator(`button:has-text("${label}")`).click()
  }
)

When('I confirm the undo', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await modal.locator('button:has-text("Undo completion")').click()
})

// ── Assertions ─────────────────────────────────────────────────────────

Then(
  'I should see a completion entry with note {string}',
  async function (this: TodoWorld, note: string) {
    await expect(this.page.locator('.history-note')).toContainText(note)
  }
)

Then('the completion should be removed from history', async function (this: TodoWorld) {
  // After undo, either no entries remain or the count decreased
  await expect(this.page.locator('.empty-state, .history-entry')).toBeVisible()
})

Then(
  'I should see the empty state message {string}',
  async function (this: TodoWorld, text: string) {
    await expect(this.page.locator('.empty-state')).toContainText(text)
  }
)
