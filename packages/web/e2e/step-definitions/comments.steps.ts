import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Data setup via API ─────────────────────────────────────────────────

Given(
  'the item {string} has a comment {string}',
  async function (this: TodoWorld, itemTitle: string, content: string) {
    await this.addCommentViaApi(itemTitle, content)
  }
)

// ── Actions ────────────────────────────────────────────────────────────

When(
  'I toggle comments for {string}',
  async function (this: TodoWorld, itemTitle: string) {
    const wrapper = this.page.locator('.item-wrapper', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await wrapper.locator('.comments-toggle').click()
    // Wait for comments to load
    await this.page.waitForTimeout(500)
  }
)

When('I enter a comment {string}', async function (this: TodoWorld, text: string) {
  await this.page.locator('.comment-input').fill(text)
})

When('I click the add comment button', async function (this: TodoWorld) {
  await this.page.locator('.comment-form .btn').click()
})

When('I delete the comment {string}', async function (this: TodoWorld, content: string) {
  const row = this.page.locator('.comment-row', {
    has: this.page.locator(`.comment-content:has-text("${content}")`),
  })
  await row.locator('.comment-delete').click()
})

// ── Assertions ─────────────────────────────────────────────────────────

Then(
  'I should see the comment {string}',
  async function (this: TodoWorld, content: string) {
    await expect(
      this.page.locator(`.comment-content:has-text("${content}")`)
    ).toBeVisible()
  }
)

Then(
  'I should not see the comment {string}',
  async function (this: TodoWorld, content: string) {
    await expect(
      this.page.locator(`.comment-content:has-text("${content}")`)
    ).not.toBeVisible()
  }
)

Then(
  'I should see comments count {string} for {string}',
  async function (this: TodoWorld, count: string, itemTitle: string) {
    const wrapper = this.page.locator('.item-wrapper', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    const toggle = wrapper.locator('.comments-toggle')
    // If comments are open, close them first so the count shows in the label
    const text = await toggle.textContent()
    if (text?.includes('Hide')) {
      await toggle.click()
      await this.page.waitForTimeout(300)
    }
    await expect(toggle).toContainText(`(${count})`)
  }
)
