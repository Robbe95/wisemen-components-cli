#!/usr/bin/env node
import { Command } from "commander"
import {  getCliConfig } from "./utils/getConfig"
import { getPackageInfo } from "./utils/getPackageInfo"
import { getPackageManager } from "./utils/getPackageManager"
import { getProjectInfo } from "./utils/getProjectInfo"

import { addInitCommand } from "./commands/initCommand"
import { addAddCommand } from "./commands/addCommand"


process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

export const GLOBAL_COMPONENTS: string[] = [
  'Transitions',
  'Icons',
]
// node ./dist/index.js add button
async function main() {
  const packageInfo = getPackageInfo()
  const projectInfo = await getProjectInfo()
  const cliConfig = await getCliConfig()

  const packageManager = await getPackageManager()

  const program = new Command()
    .name("wisemen-ui")
    .description("Add wisemen-ui components to your project")
    .version(
      packageInfo.version || "0.0.1",
      "-v, --version",
      "display the version number"
    )

  addInitCommand({ program, packageManager, projectInfo, cliConfig })
  addAddCommand({ program, packageManager, cliConfig })

  program.parse()
}

main()