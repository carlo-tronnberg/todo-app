/* eslint-disable no-console */
/**
 * Code generation agent — uses Opus for creating and modifying code.
 *
 * Usage:
 *   npx tsx agents/codegen.ts "Add input validation to the auth routes"
 *   npx tsx agents/codegen.ts "Create a new route for user preferences"
 *   npx tsx agents/codegen.ts "Refactor the backup service to support versioned exports"
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

const prompt = process.argv.slice(2).join(' ')
if (!prompt) {
  console.error('Usage: npx tsx agents/codegen.ts <prompt>')
  process.exit(1)
}

async function main() {
  for await (const message of query({
    prompt,
    options: {
      model: 'claude-opus-4-6',
      cwd: process.cwd(),
      allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
      permissionMode: 'acceptEdits',
      maxTurns: 50,
      systemPrompt:
        'You are an expert software engineer. Read the existing code to understand conventions ' +
        'before making changes. Follow existing patterns, naming conventions, and project structure. ' +
        'Run tests after making changes when possible.',
    },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      console.log(message.result)
    }
  }
}

main().catch(console.error)
