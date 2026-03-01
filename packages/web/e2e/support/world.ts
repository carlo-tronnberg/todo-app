import { setWorldConstructor, World } from '@cucumber/cucumber'
import { Browser, BrowserContext, Page, chromium } from 'playwright'

export class TodoWorld extends World {
  browser!: Browser
  context!: BrowserContext
  page!: Page
  baseUrl: string = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

  async openBrowser() {
    this.browser = await chromium.launch({
      headless: process.env.E2E_HEADLESS !== 'false',
    })
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    this.page = await this.context.newPage()
  }

  async closeBrowser() {
    await this.page?.close()
    await this.context?.close()
    await this.browser?.close()
  }
}

setWorldConstructor(TodoWorld)
