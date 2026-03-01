Feature: Calendar View
  As an authenticated user
  I want to see my tasks on a calendar
  So that I can plan ahead visually

  Background:
    Given I am logged in as "cal@example.com"
    And I have the following items:
      | title              | dueDate    |
      | Pay electricity    | 2024-06-15 |
      | Read water meter   | 2024-06-28 |
      | Monthly insurance  | 2024-06-01 |

  Scenario: View the calendar
    When I navigate to the calendar page
    Then I should see the current month displayed
    And I should see "Pay electricity" on June 15
    And I should see "Read water meter" on June 28

  Scenario: Navigate to the next month
    Given I am on the calendar page showing June 2024
    When I click the next month button
    Then I should see "July 2024" as the calendar header

  Scenario: Navigate to the previous month
    Given I am on the calendar page showing June 2024
    When I click the previous month button
    Then I should see "May 2024" as the calendar header

  Scenario: Click on an item in the calendar to go to the list
    When I navigate to the calendar page
    And I click on "Pay electricity" in the calendar
    Then I should be on the list detail page for that item
