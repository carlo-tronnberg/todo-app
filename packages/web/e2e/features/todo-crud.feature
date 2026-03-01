Feature: Todo List Management
  As an authenticated user
  I want to manage my todo lists and items
  So that I can track tasks and their recurring deadlines

  Background:
    Given I am logged in as "e2e@example.com"

  Scenario: Create a new list
    Given I am on the dashboard page
    When I click the "+ New List" button
    And I fill in the list title with "Monthly Bills"
    And I click the "Create" button
    Then I should see "Monthly Bills" in the lists

  Scenario: Add a recurring todo item
    Given I have a list called "Recurring Tasks"
    And I am on the list detail page for "Recurring Tasks"
    When I click the "+ Add Item" button
    And I fill in the item title with "Electricity reading"
    And I set the due date to "2024-03-15"
    And I select recurrence type "Every N days"
    And I set interval days to "90"
    And I click the "Add" button
    Then I should see "Electricity reading" in the items list
    And I should see the recurrence label "Every 90 days"

  Scenario: Complete an item and advance its due date
    Given I have a recurring item "Pay rent" due on "2024-01-01" with monthly recurrence on day "1"
    When I click the complete button for "Pay rent"
    And I confirm the completion
    Then a completion record should be created
    And the due date for "Pay rent" should be "2024-02-01"

  Scenario: View item urgency colors
    Given I have items with different due dates
    When I view the list
    Then overdue items should have a red background
    And items due within 3 days should have an orange background
    And items due within a week should have a yellow background
    And items due later should have a green background

  Scenario: Archive a todo item
    Given I have an item called "Old task"
    When I click the archive button for "Old task"
    And I confirm the archival
    Then "Old task" should no longer appear in the list
