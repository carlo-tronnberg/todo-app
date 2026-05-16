Feature: Admin Manages Shares on Any List
  As a system admin
  I want to manage shares on lists I don't own
  So that I can fully administer the application

  # The scenarios below require a pre-seeded system admin user, which the
  # browser-side test world cannot bootstrap (admin status is a DB flag and
  # there is no public endpoint to grant it). They are covered by:
  #   - packages/api/test/integration/routes/admin.test.ts
  #     ("System admin manages shares on another user’s list")
  #   - packages/web/test/unit/views/AdminListsView.test.ts
  #     (lock toggle, confirm flow, ShareManageModal wiring)
  #
  # Documented BDD scenarios (covered by the tests above):
  #
  # Scenario: Row is read-only by default with a lock icon
  #   Given I am logged in as a system admin
  #   And another user has a list "Alice Tasks"
  #   And I am on the all lists admin page
  #   Then the row for "Alice Tasks" should show a 🔒 lock icon
  #   And the row should not show a Manage shares button
  #
  # Scenario: Admin unlocks a row after confirming
  #   When I click the lock icon for "Alice Tasks"
  #   Then I should see a confirmation dialog mentioning "Alice"
  #   When I click the "Continue" button
  #   Then the row for "Alice Tasks" should show a 🔓 unlock icon
  #   And a Manage shares button should be visible
  #
  # Scenario: Admin cancels the unlock confirmation
  #   When I click the lock icon for "Alice Tasks"
  #   And I click the "Cancel" button in the confirmation
  #   Then the row for "Alice Tasks" should remain locked
  #
  # Scenario: Admin re-locks an unlocked row
  #   Given the row for "Alice Tasks" is unlocked
  #   When I click the 🔓 unlock icon
  #   Then the row for "Alice Tasks" should be locked again
