Feature: Backup and Restore
  As an authenticated user
  I want to back up and restore my data
  So that I do not lose my lists and items

  Background:
    Given I am logged in as "backup@example.com"

  Scenario: Download a backup
    Given I have a list called "Important"
    And I have an item called "Task A" in list "Important"
    When I navigate to the settings page
    And I click the "Download backup" button
    Then a backup file should be downloaded

  Scenario: Restore from a backup file
    When I navigate to the settings page
    And I upload a valid backup file with 2 lists and 4 items
    Then I should see a restore success message with "2" lists and "4" items
