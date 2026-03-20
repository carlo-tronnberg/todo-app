Feature: Audit Log
  As an authenticated user
  I want to view a log of all changes
  So that I can track what happened and when

  Background:
    Given I am logged in as "audit@example.com"

  Scenario: View audit log after creating a list
    Given I have a list called "Audit Test List"
    When I navigate to the audit log page
    Then I should see "Change Log" as the page heading
    And I should see an audit entry with action "list.create"

  Scenario: Empty audit log
    When I navigate to the audit log page
    Then I should see "Change Log" as the page heading

  Scenario: Load more audit entries
    Given I have more than 100 audit entries
    When I navigate to the audit log page
    Then I should see the "Load more" button
    When I click the "Load more" button
    Then I should see more audit entries
