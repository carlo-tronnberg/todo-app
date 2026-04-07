import { Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Then('I should see the undo button', async function (this: TodoWorld) {
  await expect(this.page.locator('.undo-btn')).toBeVisible()
})

Then('I should see the redo button', async function (this: TodoWorld) {
  await expect(this.page.locator('.redo-btn')).toBeVisible()
})

Then('the undo button should be disabled', async function (this: TodoWorld) {
  await expect(this.page.locator('.undo-btn')).toBeDisabled()
})

Then('the redo button should be disabled', async function (this: TodoWorld) {
  await expect(this.page.locator('.redo-btn')).toBeDisabled()
})
