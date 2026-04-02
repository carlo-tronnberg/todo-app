Feature: Completion Amount
  As a user
  I want to enter an amount when completing an item
  So that I can track how much I paid or spent

  Background:
    Given I am logged in as "completion-amt@example.com"
    And I have a list called "Bills" with default currency "SEK"
    And I have an item called "Pay electricity" in list "Bills"

  Scenario: Amount field is focused and currency pre-selected when completing
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay electricity"
    Then the amount field in the completion modal should be focused
    And the currency select in the completion modal should show "SEK"

  Scenario: Complete an item with an amount
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay electricity"
    And I enter the completion amount "450.50"
    And I click the "Complete" button
    Then "Pay electricity" should still appear in the items list

  Scenario: Complete an item with amount and note
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay electricity"
    And I enter the completion amount "325"
    And I enter the completion note "March bill"
    And I click the "Complete" button
    Then "Pay electricity" should still appear in the items list

  Scenario: Complete an item without amount
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay electricity"
    And I click the "Complete" button
    Then "Pay electricity" should still appear in the items list

  Scenario: Tab from amount to note field
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay electricity"
    And I enter the completion amount "100"
    And I press Tab in the completion amount field
    Then the completion note field should be focused
