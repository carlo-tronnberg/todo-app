import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Navigation ─────────────────────────────────────────────────────────

When(
  'I navigate to the calendar page for {string}',
  async function (this: TodoWorld, monthYear: string) {
    await this.page.goto(`${this.baseUrl}/calendar`)
    await this.page.waitForSelector('.cal-header')

    // Parse the target month/year
    const [targetMonth, targetYear] = monthYear.split(' ')

    // Use the month picker to jump to the right month
    const heading = this.page.locator('.cal-heading-btn')
    const currentText = await heading.textContent()

    if (!currentText?.includes(targetMonth) || !currentText?.includes(targetYear)) {
      // Open month/year picker
      await heading.click()
      await this.page.waitForSelector('.month-picker')

      // Navigate to the right year
      const yearLabel = this.page.locator('.month-picker-year-label')
      let currentYear = await yearLabel.textContent()
      const yearNavBtns = this.page.locator('.month-picker-year-nav')
      while (currentYear?.trim() !== targetYear) {
        const yearNum = parseInt(currentYear?.trim() ?? '0', 10)
        const targetNum = parseInt(targetYear, 10)
        if (yearNum < targetNum) {
          await yearNavBtns.nth(1).click() // › (increment)
        } else {
          await yearNavBtns.nth(0).click() // ‹ (decrement)
        }
        currentYear = await yearLabel.textContent()
      }

      // Click the target month
      await this.page.locator(`.month-picker-btn:has-text("${targetMonth.slice(0, 3)}")`).click()
    }
  }
)

When('I click the next month button', async function (this: TodoWorld) {
  await this.page.locator('.cal-header .nav-btn').nth(1).click()
  await this.page.waitForTimeout(300)
})

When('I click the previous month button', async function (this: TodoWorld) {
  await this.page.locator('.cal-header .nav-btn').first().click()
  await this.page.waitForTimeout(300)
})

When(
  'I click the filter chip for {string}',
  async function (this: TodoWorld, listTitle: string) {
    await this.page.locator(`.cal-filter-chip:has-text("${listTitle}")`).click()
    await this.page.waitForTimeout(300)
  }
)

// ── Assertions ─────────────────────────────────────────────────────────

Then(
  'I should see {string} on day {int}',
  async function (this: TodoWorld, itemTitle: string, day: number) {
    const cell = this.page.locator('.cal-cell', {
      has: this.page.locator(`.cal-date-num:has-text("${day}")`),
    })
    await expect(
      cell.locator(`.cal-item:has-text("${itemTitle}")`)
    ).toBeVisible()
  }
)

Then(
  'I should see {string} as the calendar heading',
  async function (this: TodoWorld, text: string) {
    await expect(this.page.locator('.cal-heading-btn')).toContainText(text)
  }
)

Then(
  'I should see the current month as the calendar heading',
  async function (this: TodoWorld) {
    const now = new Date()
    const monthName = now.toLocaleString('en-US', { month: 'long' })
    const year = now.getFullYear()
    await expect(this.page.locator('.cal-heading-btn')).toContainText(`${monthName} ${year}`)
  }
)

Then(
  'I should not see {string} on the calendar',
  async function (this: TodoWorld, itemTitle: string) {
    await expect(
      this.page.locator(`.cal-item:has-text("${itemTitle}")`)
    ).not.toBeVisible()
  }
)
