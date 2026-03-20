import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Navigation ─────────────────────────────────────────────────────────

When('I navigate to the profile page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/profile`)
  await this.page.waitForSelector('.profile-page')
})

// ── Personal details form ──────────────────────────────────────────────

When(
  'I fill in the first name field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section').first()
    const input = section.locator('input.form-input').first()
    await input.clear()
    await input.fill(value)
  }
)

When(
  'I fill in the last name field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section').first()
    const input = section.locator('input.form-input').nth(1)
    await input.clear()
    await input.fill(value)
  }
)

When(
  'I fill in the phone field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section').first()
    await section.locator('input[type="tel"]').fill(value)
  }
)

// ── Change password form ───────────────────────────────────────────────

When(
  'I fill in the current password field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section:has(h2:has-text("Change password"))')
    await section.locator('input[type="password"]').first().fill(value)
  }
)

When(
  'I fill in the new password field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section:has(h2:has-text("Change password"))')
    await section.locator('input[type="password"]').nth(1).fill(value)
  }
)

When(
  'I fill in the confirm password field with {string}',
  async function (this: TodoWorld, value: string) {
    const section = this.page.locator('.profile-section:has(h2:has-text("Change password"))')
    await section.locator('input[type="password"]').nth(2).fill(value)
  }
)

// ── Assertions ─────────────────────────────────────────────────────────

Then('I should see the username field is disabled', async function (this: TodoWorld) {
  const section = this.page.locator('.profile-section').first()
  const usernameInput = section.locator('input[disabled]')
  await expect(usernameInput).toBeVisible()
})
