<template>
  <div class="changelog-page">
    <h1>Changelog</h1>
    <section v-for="entry in entries" :key="entry.version" class="card changelog-entry">
      <h2>{{ entry.version }}</h2>
      <ul>
        <li v-for="(item, i) in entry.changes" :key="i">{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
  const entries = [
    {
      version: 'v0.6.0',
      changes: [
        'List sharing: invite users by email to collaborate on lists',
        'Shared user avatars displayed in list header',
        'Share management modal (add/remove collaborators)',
        'Shared lists appear on dashboard alongside owned lists',
        'Shared users can view and edit items, complete, and comment',
        'Add Item button moved below header, closer to items',
        'Backup/restore includes list shares (by email)',
      ],
    },
    {
      version: 'v0.5.0',
      changes: [
        'Simplified nav: single avatar menu with Profile, Settings, About, Logout',
        'Google profile picture shown as avatar button (top-right)',
        'Dark/light theme toggle moved to Settings page',
        'New About page with feature overview and changelog link',
        'New Changelog page with version history',
        'Nav links wrap to second row on mobile',
        'Dropdowns close on outside click',
        'App title links back to dashboard',
      ],
    },
    {
      version: 'v0.4.1',
      changes: [
        'Optional emoji icon for lists (shown in tabs, cards, headers)',
        'Fix scrollbar jump when switching list tabs',
        'List tabs for quick switching between lists',
        'Compact item create/edit form with wider modal',
        'Case-insensitive sorting of transaction types',
      ],
    },
    {
      version: 'v0.4.0',
      changes: [
        'Configurable transaction types (Autogiro, Bank card, etc.)',
        'Transaction type on items and completions',
        'Settings page for managing transaction types',
        'Escape key closes all modals',
        'Compact item create/edit form with wider modal',
        'List tabs for quick switching between lists',
      ],
    },
    {
      version: 'v0.3.0',
      changes: [
        'URL field on items with clickable link icon',
        'Comment counts shown without opening comments',
      ],
    },
    {
      version: 'v0.2.0',
      changes: [
        'Recurrence interval multiplier (every N weeks/months/years)',
        'Google SSO login',
        'Settings page with backup/restore (accessible to SSO users)',
        'App served at /todo/ subpath',
        'Lists sorted alphabetically on dashboard',
        'Clickable audit log entries with item detail modal',
      ],
    },
    {
      version: 'v0.1.0',
      changes: [
        'Amount and currency on completions',
        'Pre-fill completion amount from item default',
        'Completion history as inline modal',
        'Calendar: clickable list names under unscheduled items',
        'Due-this-month count includes overdue items',
        'Items sorted by due date within urgency groups',
      ],
    },
    {
      version: 'v0.0.1',
      changes: [
        'Initial release: lists, items, recurrence, completions, comments',
        'Calendar view with monthly grid',
        'Audit log, backup/restore',
        'JWT auth with profile management',
        'Docker deployment for Asustor NAS',
      ],
    },
  ]
</script>

<style scoped>
  .changelog-page {
    max-width: 600px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .changelog-entry {
    margin-bottom: 1rem;
  }
  .changelog-entry h2 {
    margin-top: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .changelog-entry ul {
    padding-left: 1.25rem;
    margin: 0.5rem 0 0;
  }
  .changelog-entry li {
    font-size: 0.88rem;
    margin-bottom: 0.2rem;
    color: var(--color-text-muted);
  }
</style>
