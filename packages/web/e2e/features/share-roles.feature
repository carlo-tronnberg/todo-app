Feature: Share Roles and User Management
  As a list owner
  I want to assign roles to shared users
  So that I can control their access level

  Scenario: Share modal shows role selector
    Given I am logged in as "roles@example.com"
    And I have a list called "Shared Tasks"
    And I am on the list detail page for "Shared Tasks"
    When I click the "Share" button
    Then I should see a role selector in the share form

  Scenario: Admin users see the Users link in the menu
    Given I am logged in as "admin@example.com"
    Then the profile menu should contain "Users"
