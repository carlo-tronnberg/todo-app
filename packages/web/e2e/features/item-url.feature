Feature: Item URL Field
  As a user
  I want to attach a URL to a todo item
  So that I can quickly access related links

  Background:
    Given I am logged in as "itemurl@example.com"
    And I have a list called "Tasks"
    And I am on the list detail page for "Tasks"

  Scenario: Create an item with a URL
    When I click the "+ Add Item" button
    And I fill in the item title with "Read article"
    And I fill in the item URL with "https://example.com/article"
    And I click the "Add" button
    Then I should see "Read article" in the items list
    And I should see a URL icon for "Read article"

  Scenario: URL icon opens link in new window
    Given I have an item with URL "https://example.com" called "Visit site" in list "Tasks"
    And I am on the list detail page for "Tasks"
    Then the URL icon for "Visit site" should link to "https://example.com"
