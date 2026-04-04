import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

When('I fill in the item URL with {string}', async function (this: TodoWorld, url: string) {
  const modal = this.page.locator('.modal')
  await modal.locator('input[type="url"]').fill(url)
})

Then('I should see a URL icon for {string}', async function (this: TodoWorld, title: string) {
  await this.page.reload()
  await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
  const item = this.page.locator('.todo-item', {
    has: this.page.locator(`.todo-title:has-text("${title}")`),
  })
  await expect(item.locator('.url-link')).toBeVisible()
})

Then(
  'the URL icon for {string} should link to {string}',
  async function (this: TodoWorld, title: string, url: string) {
    await this.page.reload()
    await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${title}")`),
    })
    await expect(item.locator('.url-link')).toHaveAttribute('href', url)
    await expect(item.locator('.url-link')).toHaveAttribute('target', '_blank')
  }
)

Given(
  'I have an item with URL {string} called {string} in list {string}',
  async function (this: TodoWorld, url: string, title: string, listTitle: string) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    await this.createItemViaApi(listTitle, { title, url })
  }
)
