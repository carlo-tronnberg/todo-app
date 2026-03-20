import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Assertions ─────────────────────────────────────────────────────────

Then('a backup file should be downloaded', async function (this: TodoWorld) {
  // Set up download listener before clicking
  const [download] = await Promise.all([
    this.page.waitForEvent('download'),
    this.page.locator('.backup-actions button:first-child').click(),
  ])
  const filename = download.suggestedFilename()
  expect(filename).toMatch(/^todo-backup-\d{4}-\d{2}-\d{2}\.json$/)
})

When(
  'I upload a valid backup file with {int} lists and {int} items',
  async function (this: TodoWorld, listCount: number, itemCount: number) {
    // Build a backup payload matching the expected BackupData format
    const lists = Array.from({ length: listCount }, (_, i) => ({
      title: `Restored List ${i + 1}`,
      description: null,
      defaultCurrency: null,
      items: Array.from({ length: Math.ceil(itemCount / listCount) }, (_, j) => ({
        title: `Restored Item ${i + 1}-${j + 1}`,
        description: null,
        dueDate: null,
        startDate: null,
        startTime: null,
        endTime: null,
        amount: null,
        currency: null,
        colorOverride: null,
        sortOrder: j,
      })),
      recurrenceRules: [],
      completions: [],
      comments: [],
    }))

    const backupData = JSON.stringify({ version: 1, lists })

    // Use Playwright's file chooser to upload
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.page.locator('.restore-label').click()
    const fileChooser = await fileChooserPromise

    // Create a temporary file buffer
    await fileChooser.setFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupData),
    })
  }
)

// ── Assertions ─────────────────────────────────────────────────────────

Then(
  'I should see a restore success message with {string} lists and {string} items',
  async function (this: TodoWorld, lists: string, items: string) {
    const alert = this.page.locator('.alert-success')
    await expect(alert).toContainText(lists)
    await expect(alert).toContainText(items)
  }
)
