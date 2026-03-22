import { Given, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Shared data setup via API ──────────────────────────────────────────

Given('I have a list called {string}', async function (this: TodoWorld, title: string) {
  await this.createListViaApi(title)
})

Given(
  'I have an item called {string} in list {string}',
  async function (this: TodoWorld, itemTitle: string, listTitle: string) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    await this.createItemViaApi(listTitle, { title: itemTitle })
  }
)

// ── Navigation ─────────────────────────────────────────────────────────

Given('I am on the dashboard page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/`)
  await this.page.waitForSelector('.dashboard-header, .empty-state', { timeout: 10_000 })
})

Given(
  'I am on the list detail page for {string}',
  async function (this: TodoWorld, listTitle: string) {
    const list = this.getList(listTitle)
    await this.page.goto(`${this.baseUrl}/lists/${list.id}`)
    await this.page.waitForSelector('.list-header', { timeout: 10_000 })
  }
)

// ── Generic assertions ─────────────────────────────────────────────────

Then('I should see {string} as the page heading', async function (this: TodoWorld, text: string) {
  await expect(this.page.locator('h1')).toContainText(text)
})

Then('I should see {string} as a success message', async function (this: TodoWorld, text: string) {
  await expect(this.page.locator('.alert-success')).toContainText(text)
})
