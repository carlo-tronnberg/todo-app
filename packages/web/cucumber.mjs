export default {
  require: ['e2e/support/*.ts', 'e2e/step-definitions/*.ts'],
  requireModule: ['tsx'],
  format: ['progress', 'html:e2e/reports/cucumber-report.html'],
  paths: ['e2e/features/**/*.feature'],
}
