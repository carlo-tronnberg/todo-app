Feature: Google SSO Login
  As a user
  I want to sign in with my Google account
  So that I can access the app without a separate password

  Scenario: Google sign-in button is visible on the login page
    Given I am on the login page
    Then I should see the "Sign in with Google" button

  Scenario: Successful Google login creates account and redirects to dashboard
    Given a Google user with email "alice@gmail.com" and name "Alice Smith" authenticates via API
    Then the response should contain a valid JWT token
