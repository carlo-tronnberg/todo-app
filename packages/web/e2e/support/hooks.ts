import { Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from './world'

setDefaultTimeout(30_000)
expect.configure({ timeout: 10_000 })

Before(async function (this: TodoWorld) {
  await this.openBrowser()
})

After(async function (this: TodoWorld) {
  await this.closeBrowser()
})
