Feature: Calendar View
  As an authenticated user
  I want to see my tasks on a calendar
  So that I can plan ahead visually

  Background:
    Given I am logged in as "cal@example.com"
    And I have a list called "Bills"
    And I have the following items in list "Bills":
      | title             | dueDate    |
      | Pay electricity   | 2026-04-15 |
      | Read water meter  | 2026-04-28 |
      | Monthly insurance | 2026-04-01 |

  Scenario: View items on the calendar
    When I navigate to the calendar page for "April 2026"
    Then I should see "Pay electricity" on day 15
    And I should see "Read water meter" on day 28
    And I should see "Monthly insurance" on day 1

  Scenario: Navigate to the next month
    When I navigate to the calendar page for "April 2026"
    And I click the next month button
    Then I should see "May 2026" as the calendar heading

  Scenario: Navigate to the previous month
    When I navigate to the calendar page for "April 2026"
    And I click the previous month button
    Then I should see "March 2026" as the calendar heading

  Scenario: Navigate to today
    When I navigate to the calendar page for "January 2026"
    And I click the "Today" button
    Then I should see the current month as the calendar heading

  Scenario: Filter items by list
    Given I have a list called "Personal"
    And I have the following items in list "Personal":
      | title      | dueDate    |
      | Gym class  | 2026-04-15 |
    When I navigate to the calendar page for "April 2026"
    Then I should see "Pay electricity" on day 15
    And I should see "Gym class" on day 15
    When I click the filter chip for "Bills"
    Then I should not see "Pay electricity" on the calendar
    And I should see "Gym class" on day 15
