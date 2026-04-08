import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { chromium, Browser } from 'playwright'
import { TodoWorld } from './world'

setDefaultTimeout(30_000)
expect.configure({ timeout: 10_000 })

let sharedBrowser: Browser

BeforeAll(async () => {
  sharedBrowser = await chromium.launch({
    headless: process.env.E2E_HEADLESS !== 'false',
  })
})

AfterAll(async () => {
  await sharedBrowser?.close()
})

Before(async function (this: TodoWorld) {
  await this.openContext(sharedBrowser)
})

After(async function (this: TodoWorld) {
  await this.closeContext()
})
