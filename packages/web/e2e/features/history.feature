Feature: Completion History
  As an authenticated user
  I want to view and manage completion history for my items
  So that I can track progress and undo mistakes

  Background:
    Given I am logged in as "history@example.com"
    And I have a list called "Bills"

  Scenario: View completion history
    Given I have a completed item "Pay rent" with note "March paid" in list "Bills"
    When I navigate to the history page for "Pay rent"
    Then I should see "Completion History" as the page heading
    And I should see a completion entry with note "March paid"

  Scenario: Undo a completion
    Given I have a completed item "Pay rent" with note "Oops" in list "Bills"
    When I navigate to the history page for "Pay rent"
    And I click the "Undo" button for the latest completion
    And I confirm the undo
    Then the completion should be removed from history

  Scenario: Empty history
    Given I have an item called "New task" in list "Bills"
    When I navigate to the history page for "New task"
    Then I should see the empty state message "No completions recorded yet."
