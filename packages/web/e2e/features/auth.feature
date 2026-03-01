Feature: Authentication
  As a user
  I want to register and log in
  So that I can access my todo lists

  Background:
    Given I am on the register page

  Scenario: Successful registration
    When I fill in the username field with "testuser"
    And I fill in the email field with "testuser@example.com"
    And I fill in the password field with "SecurePass123"
    And I click the "Register" button
    Then I should be on the dashboard page
    And I should see "testuser" in the navigation

  Scenario: Login with valid credentials
    Given a user with email "login@example.com" and password "SecurePass123" exists
    And I am on the login page
    When I fill in the email field with "login@example.com"
    And I fill in the password field with "SecurePass123"
    And I click the "Sign In" button
    Then I should be on the dashboard page

  Scenario: Login with invalid credentials
    Given I am on the login page
    When I fill in the email field with "wrong@example.com"
    And I fill in the password field with "WrongPass!"
    And I click the "Sign In" button
    Then I should see an error message "Invalid email or password"

  Scenario: Logout
    Given I am logged in as "user@example.com"
    When I click the "Logout" button
    Then I should be on the login page
