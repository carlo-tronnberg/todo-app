import { setWorldConstructor, World } from '@cucumber/cucumber'
import { Browser, BrowserContext, Page, chromium } from 'playwright'

export interface TestList {
  id: string
  title: string
}

export interface TestItem {
  id: string
  listId: string
  title: string
  dueDate?: string | null
}

export class TodoWorld extends World {
  browser!: Browser
  context!: BrowserContext
  page!: Page
  baseUrl: string = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
  apiUrl: string = process.env.E2E_API_URL ?? 'http://localhost:3000'

  // Auth state for API calls
  token: string | null = null
  currentEmail: string | null = null
  currentPassword: string = 'SecurePass123'

  // Map original email → actual registered (unique) email
  registeredEmails: Map<string, string> = new Map()

  // Test data references (populated via API helpers)
  lists: Map<string, TestList> = new Map()
  items: Map<string, TestItem> = new Map()

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

  // ── API helpers ──────────────────────────────────────────────────────

  private async apiFetch(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 204) return null
    return res.json()
  }

  async apiGet(path: string) {
    return this.apiFetch('GET', path)
  }
  async apiPost(path: string, body: unknown) {
    return this.apiFetch('POST', path, body)
  }
  async apiPatch(path: string, body: unknown) {
    return this.apiFetch('PATCH', path, body)
  }
  async apiDelete(path: string) {
    return this.apiFetch('DELETE', path)
  }

  /** Register a unique user via API and store the JWT token. */
  async registerViaApi(email: string, password = 'SecurePass123') {
    const suffix = Date.now()
    const uniqueEmail = email.replace('@', `+${suffix}@`)
    const username = `user${suffix}`

    const data = await this.apiPost('/api/auth/register', {
      email: uniqueEmail,
      username,
      password,
    })
    this.token = data.token
    this.currentEmail = uniqueEmail
    this.currentPassword = password
    this.registeredEmails.set(email, uniqueEmail)
    return data
  }

  /** Register via API, then inject the token into localStorage
   *  using the correct key ('auth_token') so the Pinia auth store
   *  and Axios interceptor both recognise the session. */
  async loginViaBrowser(email: string, password = 'SecurePass123') {
    const data = await this.registerViaApi(email, password)

    // Navigate to any page first so we have access to localStorage
    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.waitForSelector('.auth-card')

    // Set the correct localStorage key the app uses
    await this.page.evaluate((t: string) => localStorage.setItem('auth_token', t), data.token)

    // Navigate to dashboard — the auth store reads auth_token on init
    await this.page.goto(`${this.baseUrl}/`)
    await this.page.waitForURL(`${this.baseUrl}/`)
    return data
  }

  /** Create a list via API and store the reference. */
  async createListViaApi(
    title: string,
    opts: { description?: string; defaultCurrency?: string } = {}
  ) {
    const data = await this.apiPost('/api/lists', { title, ...opts })
    this.lists.set(title, { id: data.id, title: data.title })
    return data
  }

  /** Create an item via API and store the reference. */
  async createItemViaApi(
    listTitle: string,
    itemData: {
      title: string
      dueDate?: string
      recurrenceRule?: { type: string; dayOfMonth?: number; intervalDays?: number }
      amount?: number
      currency?: string
      url?: string
    }
  ) {
    const list = this.lists.get(listTitle)
    if (!list) throw new Error(`List "${listTitle}" not found in test data`)

    const data = await this.apiPost(`/api/lists/${list.id}/items`, itemData)
    this.items.set(itemData.title, {
      id: data.id,
      listId: list.id,
      title: data.title,
      dueDate: data.dueDate,
    })
    return data
  }

  /** Complete an item via API. */
  async completeItemViaApi(itemTitle: string, note?: string) {
    const item = this.items.get(itemTitle)
    if (!item) throw new Error(`Item "${itemTitle}" not found in test data`)
    return this.apiPost(`/api/items/${item.id}/complete`, { note })
  }

  /** Add a comment to an item via API. */
  async addCommentViaApi(itemTitle: string, content: string) {
    const item = this.items.get(itemTitle)
    if (!item) throw new Error(`Item "${itemTitle}" not found in test data`)
    return this.apiPost(`/api/items/${item.id}/comments`, { content })
  }

  /** Get the stored list by title. */
  getList(title: string) {
    const list = this.lists.get(title)
    if (!list) throw new Error(`List "${title}" not found in test data`)
    return list
  }

  /** Get the stored item by title. */
  getItem(title: string) {
    const item = this.items.get(title)
    if (!item) throw new Error(`Item "${title}" not found in test data`)
    return item
  }
}

setWorldConstructor(TodoWorld)
