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
        <li>Organize items into lists with optional icons and currencies</li>
        <li>Recurring tasks: daily, weekly, monthly, yearly, or custom intervals</li>
        <li>Track amounts, currencies, and transaction types per item and completion</li>
        <li>Calendar view with monthly grid and unscheduled items</li>
        <li>Completion history with undo support</li>
        <li>Comments on items for notes and context</li>
        <li>Audit log of all changes</li>
        <li>Backup and restore all data as JSON</li>
        <li>Google SSO login</li>
        <li>Dark/light theme</li>
        <li>PWA — installable on mobile</li>
      </ul>
      <p class="version">Version {{ version }}</p>
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
</style>
