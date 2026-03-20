Feature: Item Comments
  As an authenticated user
  I want to add comments to my items
  So that I can keep notes and context on tasks

  Background:
    Given I am logged in as "comments@example.com"
    And I have a list called "Tasks"
    And I have an item called "Review PR" in list "Tasks"
    And I am on the list detail page for "Tasks"

  Scenario: Add a comment to an item
    When I toggle comments for "Review PR"
    And I enter a comment "Looks good, minor nits"
    And I click the add comment button
    Then I should see the comment "Looks good, minor nits"

  Scenario: Delete a comment
    Given the item "Review PR" has a comment "Old note"
    When I toggle comments for "Review PR"
    And I delete the comment "Old note"
    Then I should not see the comment "Old note"

  Scenario: View comment count after toggling
    Given the item "Review PR" has a comment "First note"
    When I toggle comments for "Review PR"
    Then I should see comments count "1" for "Review PR"
