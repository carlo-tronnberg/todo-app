/* eslint-disable no-console */
/**
 * Smart agent router — uses Sonnet for analysis, Opus for code changes.
 *
 * A fast Haiku call classifies the intent, then dispatches to the right agent.
 *
 * Usage:
 *   npx tsx agents/agent.ts "Explain the authentication flow"
 *   npx tsx agents/agent.ts "Add input validation to the auth routes"
 */
import Anthropic from '@anthropic-ai/sdk'
import { query, type Options } from '@anthropic-ai/claude-agent-sdk'

const prompt = process.argv.slice(2).join(' ')
if (!prompt) {
  console.error('Usage: npx tsx agents/agent.ts <prompt>')
  process.exit(1)
}

type AgentMode = 'analyze' | 'codegen'

const agents: Record<AgentMode, Options> = {
  analyze: {
    model: 'claude-sonnet-4-6',
    allowedTools: ['Read', 'Glob', 'Grep'],
    maxTurns: 30,
    systemPrompt:
      'You are a code analysis assistant. Read and analyze code to answer questions. ' +
      'Do not modify any files. Focus on clarity and accuracy.',
  },
  codegen: {
    model: 'claude-opus-4-6',
    allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 50,
    systemPrompt:
      'You are an expert software engineer. Read the existing code to understand conventions ' +
      'before making changes. Follow existing patterns, naming conventions, and project structure. ' +
      'Run tests after making changes when possible.',
  },
}

async function classify(userPrompt: string): Promise<AgentMode> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 16,
    messages: [{ role: 'user', content: userPrompt }],
    system:
      "Classify the user request as either 'analyze' or 'codegen'.\n" +
      '- analyze: reading, explaining, searching, reviewing, finding bugs, understanding code\n' +
      '- codegen: creating, modifying, refactoring, adding, fixing, deleting, writing code or tests\n' +
      'Respond with exactly one word: analyze or codegen',
    output_config: {
      format: {
        type: 'json_schema' as const,
        schema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['analyze', 'codegen'] },
          },
          required: ['mode'],
          additionalProperties: false,
        },
      },
    },
  })

  const text = response.content.find((b) => b.type === 'text')
  if (text && text.type === 'text') {
    try {
      const parsed = JSON.parse(text.text)
      if (parsed.mode === 'analyze' || parsed.mode === 'codegen') return parsed.mode
    } catch {
      // fall through
    }
  }
  return 'analyze'
}

async function main() {
  const mode = await classify(prompt)
  const config = agents[mode]

  console.error(`→ ${mode} (${config.model})\n`)

  for await (const message of query({
    prompt,
    options: { cwd: process.cwd(), ...config },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      console.log(message.result)
    }
  }
}

main().catch(console.error)
