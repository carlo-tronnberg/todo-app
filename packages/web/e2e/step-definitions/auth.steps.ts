import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

// ── Navigation ─────────────────────────────────────────────────────────

Given('I am on the register page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/register`)
  await this.page.waitForSelector('.auth-card')
})

Given('I am on the login page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/login`)
  await this.page.waitForSelector('.auth-card')
})

// ── Setup ──────────────────────────────────────────────────────────────

Given(
  'a registered user with email {string} and password {string}',
  async function (this: TodoWorld, email: string, password: string) {
    await this.registerViaApi(email, password)
  }
)

Given('I am logged in as {string}', async function (this: TodoWorld, email: string) {
  await this.loginViaBrowser(email)
})

// ── Form fields ────────────────────────────────────────────────────────

When('I fill in the username field with {string}', async function (this: TodoWorld, value: string) {
  // Uniquify username for re-runnable tests
  const suffix = Date.now()
  await this.page.fill('#username', `${value}${suffix}`)
})

When('I fill in the email field with {string}', async function (this: TodoWorld, value: string) {
  // If this email was registered via registerViaApi, use the actual unique email
  const registered = this.registeredEmails.get(value)
  if (registered) {
    await this.page.fill('#email', registered)
    return
  }

  // On the register page, uniquify to avoid conflicts across test runs
  if (this.page.url().includes('/register')) {
    const suffix = Date.now()
    const unique = value.replace('@', `+${suffix}@`)
    await this.page.fill('#email', unique)
    return
  }

  await this.page.fill('#email', value)
})

When('I fill in the password field with {string}', async function (this: TodoWorld, value: string) {
  await this.page.fill('#password', value)
})

// ── Actions ────────────────────────────────────────────────────────────

When('I click the {string} button', async function (this: TodoWorld, label: string) {
  // For modal actions, prefer the modal-actions button to avoid ambiguity
  const modalBtn = this.page.locator(`.modal-actions button:has-text("${label}")`)
  if (await modalBtn.isVisible().catch(() => false)) {
    await modalBtn.click()
    return
  }
  await this.page.click(`button:has-text("${label}")`)
})

// ── Navigation assertions ──────────────────────────────────────────────

When('I navigate to the dashboard page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/`)
})

Then('I should be on the dashboard page', async function (this: TodoWorld) {
  await this.page.waitForURL(`${this.baseUrl}/`)
  expect(this.page.url()).toBe(`${this.baseUrl}/`)
})

Then('I should be on the login page', async function (this: TodoWorld) {
  await this.page.waitForURL(`${this.baseUrl}/login`)
  expect(this.page.url()).toContain('/login')
})

// ── Content assertions ─────────────────────────────────────────────────

Then('I should see {string} in the navigation', async function (this: TodoWorld, text: string) {
  await expect(this.page.locator('.nav-username')).toContainText(text)
})

Then(
  'I should see an error message {string}',
  async function (this: TodoWorld, message: string) {
    await expect(this.page.locator('.error-text')).toContainText(message)
  }
)
