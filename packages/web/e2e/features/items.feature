Feature: Item Management
  As an authenticated user
  I want to manage items within my lists
  So that I can track tasks and recurring deadlines

  Background:
    Given I am logged in as "items@example.com"
    And I have a list called "Tasks"
    And I am on the list detail page for "Tasks"

  Scenario: Add a simple item
    When I click the "+ Add Item" button
    And I fill in the item title with "Buy milk"
    And I click the "Add" button
    Then I should see "Buy milk" in the items list

  Scenario: Add an item with due date and amount
    When I click the "+ Add Item" button
    And I fill in the item title with "Pay electricity"
    And I set the due date to "2026-04-15"
    And I set the amount to "45.50"
    And I select currency "SEK"
    And I click the "Add" button
    Then I should see "Pay electricity" in the items list

  Scenario: Add a recurring item with custom day interval
    When I click the "+ Add Item" button
    And I fill in the item title with "Electricity reading"
    And I set the due date to "2026-04-15"
    And I select recurrence type "custom_days"
    And I set interval days to "90"
    And I click the "Add" button
    Then I should see "Electricity reading" in the items list
    And I should see the recurrence label "Every 90 days"

  Scenario: Add a monthly recurring item
    When I click the "+ Add Item" button
    And I fill in the item title with "Pay rent"
    And I set the due date to "2026-04-01"
    And I select recurrence type "monthly_on_day"
    And I set day of month to "1"
    And I click the "Add" button
    Then I should see "Pay rent" in the items list
    And I should see the recurrence label "Monthly · day 1"

  Scenario: Edit an item
    Given I have an item called "Draft task" in list "Tasks"
    When I click the edit button for item "Draft task"
    And I clear the item title
    And I fill in the item title with "Final task"
    And I click the "Save" button
    Then I should see "Final task" in the items list

  Scenario: Complete an item and advance its due date
    Given I have a recurring item "Pay rent" due on "2026-04-01" with monthly recurrence on day "1" in list "Tasks"
    When I click the complete button for "Pay rent"
    And I enter the completion note "April paid"
    And I click the "Complete" button
    Then the due date for "Pay rent" should advance to the next occurrence

  Scenario: Archive a todo item
    Given I have an item called "Old task" in list "Tasks"
    When I click the archive button for "Old task"
    Then "Old task" should no longer appear in the items list

  Scenario: Duplicate an item
    Given I have an item called "Template task" in list "Tasks"
    When I click the duplicate button for "Template task"
    And I click the "Add" button
    Then I should see "Copy of Template task" in the items list

  Scenario: View item urgency levels
    Given I have the following items in list "Tasks":
      | title        | dueDate    |
      | Overdue task | 2026-03-01 |
      | Urgent task  | 2026-03-20 |
      | Soon task    | 2026-03-25 |
      | Later task   | 2026-04-15 |
      | No date task |            |
    When I view the items list
    Then "Overdue task" should have urgency class "urgency-overdue"
    And "Urgent task" should have urgency class "urgency-high"
    And "Soon task" should have urgency class "urgency-medium"
    And "Later task" should have urgency class "urgency-low"
    And "No date task" should have urgency class "urgency-none"
