Feature: Transaction Type
  As a user
  I want to categorize items by transaction type
  So that I can track how payments are made

  Scenario: Default transaction types are available
    Given I am logged in as "txtype@example.com"
    And I have a list called "Bills"
    And I am on the list detail page for "Bills"
    When I click the "+ Add Item" button
    Then the transaction type dropdown should contain "Autogiro"
    And the transaction type dropdown should contain "Bank card"
    And the transaction type dropdown should contain "Bank transfer"
    And the transaction type dropdown should contain "Manual"
    And the transaction type dropdown should contain "Swish"

  Scenario: Create an item with a transaction type
    Given I am logged in as "txtype@example.com"
    And I have a list called "Bills"
    And I am on the list detail page for "Bills"
    When I click the "+ Add Item" button
    And I fill in the item title with "Electricity"
    And I set the amount to "450"
    And I select transaction type "Autogiro"
    And I click the "Add" button
    Then I should see "Electricity" in the items list
    And I should see "Autogiro" for item "Electricity"

  Scenario: Configure transaction types in settings
    Given I am logged in as "txtype@example.com"
    When I click the settings icon
    Then I should see "Transaction Types" on the settings page

  Scenario: Transaction type shown on completion
    Given I am logged in as "txtype@example.com"
    And I have a list called "Bills"
    And I have an item called "Pay rent" in list "Bills"
    And I am on the list detail page for "Bills"
    When I click the complete button for "Pay rent"
    Then the transaction type dropdown should be visible in the completion modal
