Feature: Google SSO Login
  As a user
  I want to sign in with my Google account
  So that I can access the app without a separate password

  Scenario: Google sign-in button is visible on the login page
    Given I am on the login page
    Then I should see the "Sign in with Google" button

  Scenario: Google sign-in button redirects to Google
    Given I am on the login page
    When I click the "Sign in with Google" button
    Then I should be redirected to Google's OAuth page

  Scenario: Successful Google login for a new user
    Given a Google user with email "alice@gmail.com" and name "Alice Smith" authenticates
    Then I should be on the dashboard page
    And I should see "Alice" in the navigation

  Scenario: Successful Google login for an existing user
    Given a registered user with email "bob@gmail.com" and password "SecurePass123"
    And a Google user with email "bob@gmail.com" and name "Bob Jones" authenticates
    Then I should be on the dashboard page

  Scenario: Google login preserves existing user data
    Given a registered user with email "carol@gmail.com" and password "SecurePass123"
    And a Google user with email "carol@gmail.com" and name "Carol White" authenticates
    When I navigate to the profile page
    Then I should see "carol@gmail.com" in the email field
