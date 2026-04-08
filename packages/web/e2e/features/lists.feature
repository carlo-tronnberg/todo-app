Feature: List Management
  As an authenticated user
  I want to manage my todo lists
  So that I can organise tasks into categories

  Background:
    Given I am logged in as "lists@example.com"
    And I am on the dashboard page

  Scenario: Create a new list
    When I click the "+ New List" button
    And I fill in the list title with "Monthly Bills"
    And I click the "Create" button
    Then I should see "Monthly Bills" in the lists

  Scenario: Create a list with description and currency
    When I click the "+ New List" button
    And I fill in the list title with "Groceries"
    And I fill in the list description with "Weekly shopping"
    And I select "EUR" as the default currency
    And I click the "Create" button
    Then I should see "Groceries" in the lists

  Scenario: Edit a list title
    Given I have a list called "Old Name"
    When I click the edit button for "Old Name"
    And I clear the list title
    And I fill in the list title with "New Name"
    And I click the "Save" button
    Then I should see "New Name" in the lists
    And I should not see "Old Name" in the lists

  Scenario: Delete a list
    Given I have a list called "Temporary"
    When I click the delete button for "Temporary"
    And I click the "Delete permanently" button
    Then I should not see "Temporary" in the lists

  Scenario: Navigate to list detail
    Given I have a list called "My Tasks"
    And I have a list called "Other List"
    When I click on the list "My Tasks"
    Then I should be on the list detail page for "My Tasks"
    And I should see "My Tasks" as the list heading
