import { IConfiguration } from '@cucumber/cucumber/api'

const config: Partial<IConfiguration> = {
  require: ['e2e/support/*.ts', 'e2e/step-definitions/*.ts'],
  requireModule: ['ts-node/register'],
  format: ['progress', 'html:e2e/reports/cucumber-report.html'],
  publishQuiet: true,
  paths: ['e2e/features/**/*.feature'],
}

export default config
