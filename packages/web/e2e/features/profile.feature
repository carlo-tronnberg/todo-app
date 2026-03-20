Feature: Profile Management
  As an authenticated user
  I want to manage my profile and password
  So that I can keep my account details up to date

  Background:
    Given I am logged in as "profile@example.com"

  Scenario: View profile page
    When I navigate to the profile page
    Then I should see "Profile" as the page heading
    And I should see the username field is disabled

  Scenario: Update personal details
    When I navigate to the profile page
    And I fill in the first name field with "Alice"
    And I fill in the last name field with "Smith"
    And I fill in the phone field with "+46701234567"
    And I click the "Save changes" button
    Then I should see "Profile updated." as a success message
    And I should see "Alice" in the navigation

  Scenario: Change password
    When I navigate to the profile page
    And I fill in the current password field with "SecurePass123"
    And I fill in the new password field with "NewSecure456"
    And I fill in the confirm password field with "NewSecure456"
    And I click the "Change password" button
    Then I should see "Password changed." as a success message
