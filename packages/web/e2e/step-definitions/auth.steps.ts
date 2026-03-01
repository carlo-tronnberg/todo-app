import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Given('I am on the register page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/register`)
})

Given('I am on the login page', async function (this: TodoWorld) {
  await this.page.goto(`${this.baseUrl}/login`)
})

Given('I am logged in as {string}', async function (this: TodoWorld, email: string) {
  // Register user via API if needed, then log in
  const uniqueSuffix = Date.now()
  const testEmail = email.replace('@', `+${uniqueSuffix}@`)

  await this.page.goto(`${this.baseUrl}/register`)
  await this.page.fill('input[type="text"]', `user${uniqueSuffix}`)
  await this.page.fill('input[type="email"]', testEmail)
  await this.page.fill('input[type="password"]', 'SecurePass123')
  await this.page.click('button[type="submit"]')
  await this.page.waitForURL(`${this.baseUrl}/`)
})

When('I fill in the username field with {string}', async function (this: TodoWorld, value: string) {
  await this.page.fill('#username', value)
})

When('I fill in the email field with {string}', async function (this: TodoWorld, value: string) {
  await this.page.fill('#email', value)
})

When('I fill in the password field with {string}', async function (this: TodoWorld, value: string) {
  await this.page.fill('#password', value)
})

When('I click the {string} button', async function (this: TodoWorld, label: string) {
  await this.page.click(`button:has-text("${label}")`)
})

Then('I should be on the dashboard page', async function (this: TodoWorld) {
  await this.page.waitForURL(`${this.baseUrl}/`)
  expect(this.page.url()).toBe(`${this.baseUrl}/`)
})

Then('I should be on the login page', async function (this: TodoWorld) {
  await this.page.waitForURL(`${this.baseUrl}/login`)
  expect(this.page.url()).toContain('/login')
})

Then('I should see {string} in the navigation', async function (this: TodoWorld, text: string) {
  await expect(this.page.locator('.nav-username')).toContainText(text)
})

Then('I should see an error message {string}', async function (this: TodoWorld, message: string) {
  await expect(this.page.locator('.error-text')).toContainText(message)
})
