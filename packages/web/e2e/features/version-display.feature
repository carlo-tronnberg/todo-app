Feature: Version Display
  As a user
  I want to see the application version
  So that I know which version is running

  Scenario: Version is visible at the bottom of the page
    Given I am logged in as "version@example.com"
    Then I should see the app version in the bottom right corner
