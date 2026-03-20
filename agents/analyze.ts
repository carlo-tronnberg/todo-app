/* eslint-disable no-console */
/**
 * Code analysis agent — uses Sonnet for fast, cost-effective analysis tasks.
 *
 * Usage:
 *   npx tsx agents/analyze.ts "Explain the authentication flow"
 *   npx tsx agents/analyze.ts "Find potential bugs in the recurrence service"
 *   npx tsx agents/analyze.ts "What API endpoints exist and what do they do?"
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

const prompt = process.argv.slice(2).join(' ')
if (!prompt) {
  console.error('Usage: npx tsx agents/analyze.ts <prompt>')
  process.exit(1)
}

async function main() {
  for await (const message of query({
    prompt,
    options: {
      model: 'claude-sonnet-4-6',
      cwd: process.cwd(),
      allowedTools: ['Read', 'Glob', 'Grep'],
      maxTurns: 30,
      systemPrompt:
        'You are a code analysis assistant. Read and analyze code to answer questions. ' +
        'Do not modify any files. Focus on clarity and accuracy.',
    },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      console.log(message.result)
    }
  }
}

main().catch(console.error)
