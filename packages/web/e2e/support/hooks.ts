import { Before, After } from '@cucumber/cucumber'
import { TodoWorld } from './world'

Before(async function (this: TodoWorld) {
  await this.openBrowser()
})

After(async function (this: TodoWorld) {
  await this.closeBrowser()
})
