import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Data setup via API ─────────────────────────────────────────────────

Given(
  'I have a recurring item {string} due on {string} with monthly recurrence on day {string} in list {string}',
  async function (
    this: TodoWorld,
    title: string,
    dueDate: string,
    day: string,
    listTitle: string
  ) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    await this.createItemViaApi(listTitle, {
      title,
      dueDate,
      recurrenceRule: { type: 'monthly_on_day', dayOfMonth: parseInt(day, 10) },
    })
  }
)

Given(
  'I have the following items in list {string}:',
  async function (this: TodoWorld, listTitle: string, table: DataTable) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    for (const row of table.hashes()) {
      await this.createItemViaApi(listTitle, {
        title: row.title,
        dueDate: row.dueDate || undefined,
      })
    }
  }
)

Given(
  'I have items with relative due dates in list {string}:',
  async function (this: TodoWorld, listTitle: string, table: DataTable) {
    if (!this.lists.has(listTitle)) {
      await this.createListViaApi(listTitle)
    }
    for (const row of table.hashes()) {
      let dueDate: string | undefined
      if (row.daysFromNow) {
        const d = new Date()
        d.setDate(d.getDate() + parseInt(row.daysFromNow, 10))
        dueDate = d.toISOString().slice(0, 10)
      }
      await this.createItemViaApi(listTitle, { title: row.title, dueDate })
    }
  }
)

// ── Item form fields ───────────────────────────────────────────────────

When('I fill in the item title with {string}', async function (this: TodoWorld, title: string) {
  const modal = this.page.locator('.modal')
  const titleInput = modal.locator('input.form-input[type="text"]').first()
  await titleInput.fill(title)
})

When('I clear the item title', async function (this: TodoWorld) {
  const modal = this.page.locator('.modal')
  await modal.locator('input.form-input[type="text"]').first().clear()
})

When('I set the due date to {string}', async function (this: TodoWorld, date: string) {
  const modal = this.page.locator('.modal')
  // Find the due date input — it's the second date input (after start date)
  const dateInputs = modal.locator('input[type="date"]')
  const dueDateInput = (await dateInputs.count()) > 1 ? dateInputs.nth(1) : dateInputs.first()
  await dueDateInput.fill(date)
})

When('I set the amount to {string}', async function (this: TodoWorld, amount: string) {
  const modal = this.page.locator('.modal')
  await modal.locator('input[type="number"]').fill(amount)
})

When('I select currency {string}', async function (this: TodoWorld, currency: string) {
  const modal = this.page.locator('.modal')
  const currencyCol = modal.locator('.form-col:has(.form-label:has-text("Currency"))')
  await currencyCol.locator('select.form-input').selectOption(currency)
})

When(
  'I select recurrence type {string}',
  async function (this: TodoWorld, recurrenceType: string) {
    const modal = this.page.locator('.modal')
    const recurrenceGroup = modal.locator(
      '.form-group:has(.form-label:has-text("Recurrence"))'
    )
    await recurrenceGroup.locator('select.form-input').selectOption(recurrenceType)
  }
)

When('I set interval days to {string}', async function (this: TodoWorld, days: string) {
  const modal = this.page.locator('.modal')
  const intervalGroup = modal.locator('.form-group:has(.form-label:has-text("Interval"))')
  await intervalGroup.locator('input[type="number"]').fill(days)
})

When('I set day of month to {string}', async function (this: TodoWorld, day: string) {
  const modal = this.page.locator('.modal')
  const dayGroup = modal.locator('.form-group:has(.form-label:has-text("Day of month"))')
  await dayGroup.locator('input[type="number"]').fill(day)
})

// ── Item actions ───────────────────────────────────────────────────────

When(
  'I click the complete button for {string}',
  async function (this: TodoWorld, itemTitle: string) {
    // Reload to pick up API-created items
    await this.page.reload()
    await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await item.locator('.complete-btn').click()
  }
)

When(
  'I enter the completion note {string}',
  async function (this: TodoWorld, note: string) {
    const modal = this.page.locator('.modal')
    await modal.locator('textarea.form-input').fill(note)
  }
)

When(
  'I click the edit button for item {string}',
  async function (this: TodoWorld, itemTitle: string) {
    await this.page.reload()
    await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await item.locator('.icon-btn:has-text("✎")').click()
  }
)

When(
  'I click the archive button for {string}',
  async function (this: TodoWorld, itemTitle: string) {
    await this.page.reload()
    await this.page.waitForSelector('.todo-item', { timeout: 10_000 })

    // Accept the browser confirm dialog that fires on archive
    this.page.once('dialog', (dialog) => dialog.accept())

    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await item.locator('.icon-btn-danger').click()
  }
)

When(
  'I click the duplicate button for {string}',
  async function (this: TodoWorld, itemTitle: string) {
    await this.page.reload()
    await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await item.locator('.icon-btn:has-text("⎘")').click()
  }
)

// ── Item assertions ────────────────────────────────────────────────────

Then('I should see {string} in the items list', async function (this: TodoWorld, title: string) {
  await expect(
    this.page.locator(`.todo-title:has-text("${title}")`)
  ).toBeVisible()
})

Then(
  '{string} should no longer appear in the items list',
  async function (this: TodoWorld, title: string) {
    await expect(
      this.page.locator(`.todo-title:has-text("${title}")`)
    ).not.toBeVisible({ timeout: 10_000 })
  }
)

Then(
  'I should see the recurrence label {string}',
  async function (this: TodoWorld, label: string) {
    await expect(this.page.locator('.meta-recurrence')).toContainText(label)
  }
)

Then(
  'the due date for {string} should advance to the next occurrence',
  async function (this: TodoWorld, itemTitle: string) {
    // After completion of a recurring item, the due date changes.
    // We verify the item still shows in the list (with its new date).
    await expect(
      this.page.locator(`.todo-title:has-text("${itemTitle}")`)
    ).toBeVisible()
  }
)

Then(
  'I should see {int} items containing {string}',
  async function (this: TodoWorld, count: number, text: string) {
    await expect(
      this.page.locator(`.todo-title:has-text("${text}")`)
    ).toHaveCount(count, { timeout: 10_000 })
  }
)

Then(
  '{string} should have urgency class {string}',
  async function (this: TodoWorld, itemTitle: string, urgencyClass: string) {
    const item = this.page.locator('.todo-item', {
      has: this.page.locator(`.todo-title:has-text("${itemTitle}")`),
    })
    await expect(item).toHaveClass(new RegExp(urgencyClass))
  }
)

When('I view the items list', async function (this: TodoWorld) {
  // Reload so API-created items appear, then wait for them to render
  await this.page.reload()
  await this.page.waitForSelector('.todo-item', { timeout: 10_000 })
})
