<template>
  <div class="about-page">
    <h1>About Todo Tracker</h1>
    <section class="card about-section">
      <p>
        <strong>Todo Tracker</strong> is a personal task management app for tracking recurring
        bills, payments, and to-do items. It helps you stay on top of what's due, when it's due, and
        how much it costs.
      </p>
      <h2>Features</h2>
      <ul>
        <li>Organize items into lists with optional emoji icons and default currencies</li>
        <li>Share lists with other users (viewer/editor/admin roles)</li>
        <li>
          Recurring tasks: daily, weekly, monthly, yearly, or custom intervals with multipliers
        </li>
        <li>Track amounts, currencies, and configurable transaction types</li>
        <li>Completion with amount override and transaction type</li>
        <li>Undo/redo for edits and completions (↩/↪ or Ctrl+Z/Ctrl+Shift+Z)</li>
        <li>Calendar view with monthly grid and unscheduled items</li>
        <li>Completion history with undo support</li>
        <li>Comments on items for notes and context</li>
        <li>Swipe between lists on mobile, sticky list tabs</li>
        <li>URL links on items with clickable icon</li>
        <li>Audit log with clickable item detail view</li>
        <li>Admin panel for user management</li>
        <li>Backup and restore all data as JSON (including shares and audit logs)</li>
        <li>Google SSO login with profile picture</li>
        <li>Dark/light theme (configurable in Settings)</li>
        <li>PWA — installable on mobile, works offline</li>
      </ul>
      <p class="version">Version {{ version }}</p>
      <p class="changelog-link">
        <router-link to="/changelog">View changelog →</router-link>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
  declare const __APP_VERSION__: string
  const version = __APP_VERSION__
</script>

<style scoped>
  .about-page {
    max-width: 600px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .about-section {
    line-height: 1.7;
  }
  .about-section h2 {
    font-size: 1rem;
    margin: 1rem 0 0.5rem;
  }
  .about-section ul {
    padding-left: 1.25rem;
    margin: 0;
  }
  .about-section li {
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }
  .version {
    margin-top: 1.5rem;
    font-size: 0.82rem;
    color: var(--color-text-faint);
  }
  .changelog-link {
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
</style>
