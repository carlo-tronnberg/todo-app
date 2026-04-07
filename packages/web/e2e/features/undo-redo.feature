Feature: Undo/Redo
  As a user
  I want to undo and redo changes to my list items
  So that I can easily revert mistakes

  Background:
    Given I am logged in as "undoredo@example.com"
    And I have a list called "Tasks"
    And I have an item called "Original task" in list "Tasks"
    And I am on the list detail page for "Tasks"

  Scenario: Undo and redo buttons are visible
    Then I should see the undo button
    And I should see the redo button

  Scenario: Undo button is disabled when no actions have been performed
    Then the undo button should be disabled

  Scenario: Redo button is disabled when no undone actions exist
    Then the redo button should be disabled
