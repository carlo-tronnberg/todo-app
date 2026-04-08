import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Data setup ─────────────────────────────────────────────────────────

Given('I have more than 100 audit entries', async function (this: TodoWorld) {
  // Create many lists to generate audit entries
  for (let i = 0; i < 105; i++) {
    await this.createListViaApi(`Audit List ${i}`)
  }
})

// ── Navigation ─────────────────────────────────────────────────────────

When('I navigate to the audit log page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/audit`)
  await this.page.waitForSelector('h1')
})

// ── Assertions ─────────────────────────────────────────────────────────

Then(
  'I should see an audit entry with action {string}',
  async function (this: TodoWorld, action: string) {
    await expect(this.page.locator(`.audit-action:has-text("${action}")`)).toBeVisible()
  }
)

Then('I should see more audit entries', async function (this: TodoWorld) {
  const rows = this.page.locator('tbody tr')
  await expect.poll(async () => rows.count(), { timeout: 10_000 }).toBeGreaterThan(100)
})
