import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Given(
  'another user has shared a list {string} with me as {string}',
  async function (this: TodoWorld, title: string, role: string) {
    if (!this.token) {
      // The recipient must already be logged in; if not, register them now so
      // we have an email to share with.
      await this.loginViaBrowser('recipient@example.com')
    }
    await this.receiveSharedListFromAnotherUser(title, role)
  }
)

When('I reload the dashboard', async function (this: TodoWorld) {
  await this.page.reload()
  await this.page.waitForSelector('.list-card', { timeout: 10_000 })
})

When('I click the leave button for {string}', async function (this: TodoWorld, listTitle: string) {
  await this.page.reload()
  await this.page.waitForSelector('.list-card')
  const card = this.page.locator('.list-card', {
    has: this.page.locator(`.list-title:has-text("${listTitle}")`),
  })
  await card.locator('[title="Leave list"]').click()
})

Then(
  'the list card for {string} should have a {word} button',
  async function (this: TodoWorld, listTitle: string, action: string) {
    await this.page.waitForSelector('.list-card')
    const card = this.page.locator('.list-card', {
      has: this.page.locator(`.list-title:has-text("${listTitle}")`),
    })
    await expect(card.locator(`[title="${action} list"]`)).toBeVisible()
  }
)

Then(
  'the list card for {string} should not have a {word} button',
  async function (this: TodoWorld, listTitle: string, action: string) {
    await this.page.waitForSelector('.list-card')
    const card = this.page.locator('.list-card', {
      has: this.page.locator(`.list-title:has-text("${listTitle}")`),
    })
    await expect(card.locator(`[title="${action} list"]`)).toHaveCount(0)
  }
)
