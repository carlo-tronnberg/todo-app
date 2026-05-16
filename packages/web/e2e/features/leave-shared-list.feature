Feature: Leave a Shared List
  As a user who has received a shared list
  I want to remove myself from the share
  So that the list no longer appears in my dashboard

  Background:
    Given I am logged in as "recipient@example.com"
    And another user has shared a list "Team Tasks" with me as "editor"
    And I am on the dashboard page

  Scenario: Recipient leaves a shared list
    Then I should see "Team Tasks" in the lists
    When I click the leave button for "Team Tasks"
    And I click the "Leave" button
    Then I should not see "Team Tasks" in the lists

  Scenario: Recipient cancels leaving
    When I click the leave button for "Team Tasks"
    And I click the "Cancel" button
    Then I should see "Team Tasks" in the lists

  Scenario: Owned list shows Edit and Delete, not Leave
    Given I have a list called "My Own List"
    When I reload the dashboard
    Then the list card for "My Own List" should have a Delete button
    And the list card for "My Own List" should not have a Leave button

  Scenario: Shared list shows Leave, not Delete
    Then the list card for "Team Tasks" should have a Leave button
    And the list card for "Team Tasks" should not have a Delete button
