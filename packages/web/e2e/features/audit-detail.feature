Feature: Audit Log Item Detail
  As a user
  I want to click an audit log entry to see item details and completions
  So that I can review the full history of changes

  Background:
    Given I am logged in as "audit-detail@example.com"
    And I have a list called "Tasks"
    And I have an item called "Pay rent" in list "Tasks"

  Scenario: Clicking an item entry in the audit log shows item details
    When I navigate to the audit log page
    And I click on an audit entry for "Pay rent"
    Then I should see the item detail modal
    And I should see "Pay rent" in the item detail modal
