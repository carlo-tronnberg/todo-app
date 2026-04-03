Feature: Completion Amount Pre-fill
  As a user
  I want the completion amount pre-filled from the item's default
  So that I don't have to re-enter recurring amounts

  Scenario: Amount is pre-filled from item default
    Given I am logged in as "prefill@example.com"
    And I have a list called "Bills" with default currency "SEK"
    And I have an item with amount "450.50" and currency "SEK" called "Electricity" in list "Bills"
    And I am on the list detail page for "Bills"
    When I click the complete button for "Electricity"
    Then the completion amount field should contain "450.50"
    And the currency select in the completion modal should show "SEK"
