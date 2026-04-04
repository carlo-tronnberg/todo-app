Feature: Settings Page
  As a user
  I want a settings page with tools like backup and restore
  So that I can manage my data without needing the profile page

  Scenario: Settings page is accessible from the nav bar
    Given I am logged in as "settings@example.com"
    Then I should see the settings icon in the navigation
    When I click the settings icon
    Then I should see "Settings" as the page heading

  Scenario: Backup is available on the settings page
    Given I am logged in as "settings@example.com"
    When I click the settings icon
    Then I should see the "Download backup" button
