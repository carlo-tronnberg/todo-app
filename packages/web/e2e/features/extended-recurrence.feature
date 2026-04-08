Feature: Extended Recurrence Options
  As a user
  I want to set recurrence intervals of multiple weeks, months, or years
  So that I can schedule items that repeat at longer intervals

  Background:
    Given I am logged in as "recurrence@example.com"
    And I have a list called "Tasks"
    And I am on the list detail page for "Tasks"

  Scenario: Create an item recurring every 2 weeks
    When I click the "+ Add Item" button
    And I fill in the item title with "Biweekly review"
    And I set the due date to "2026-04-10"
    And I select recurrence type "weekly_on_day"
    And I set the recurrence interval to "2"
    And I click the "Add" button
    Then I should see "Biweekly review" in the items list
    And I should see the recurrence label "Every 2 weeks"

  Scenario: Create an item recurring every 3 months
    When I click the "+ Add Item" button
    And I fill in the item title with "Quarterly report"
    And I set the due date to "2026-04-01"
    And I select recurrence type "monthly_on_day"
    And I set day of month to "1"
    And I set the recurrence interval to "3"
    And I click the "Add" button
    Then I should see "Quarterly report" in the items list
    And I should see the recurrence label "Every 3 months on day 1"

  Scenario: Create an item recurring every 2 years
    When I click the "+ Add Item" button
    And I fill in the item title with "Passport renewal"
    And I set the due date to "2026-06-15"
    And I select recurrence type "yearly"
    And I set the recurrence interval to "2"
    And I click the "Add" button
    Then I should see "Passport renewal" in the items list
    And I should see the recurrence label "Every 2 years"
