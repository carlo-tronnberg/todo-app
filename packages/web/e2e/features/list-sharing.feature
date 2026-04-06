Feature: List Sharing
  As a user
  I want to share lists with other people
  So that we can collaborate on tasks

  Scenario: Share button is visible on list detail page
    Given I am logged in as "sharing@example.com"
    And I have a list called "Shared Tasks"
    And I am on the list detail page for "Shared Tasks"
    Then I should see the "Share" button

  Scenario: Share management modal opens
    Given I am logged in as "sharing@example.com"
    And I have a list called "Shared Tasks"
    And I am on the list detail page for "Shared Tasks"
    When I click the "Share" button
    Then I should see "Manage Sharing" as the page heading
