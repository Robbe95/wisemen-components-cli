
import { existsSync, promises as fs } from "fs"
import path from "path"
import { Command } from "commander"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"

import { getAvailableComponents } from "../utils/getComponents"
import { logger } from "../utils/logger"

import {  TAILWIND_CONFIG, STYLES } from "../templates"
import { installComponent } from "../utils/installComponent"
import { PackageManager } from "../utils/getPackageManager"
import { addInternalDependencies } from "../utils/addInternalDependencies"
import { GLOBAL_COMPONENTS } from ".."

interface AddInitCommandOptions {
  program: Command;
  packageManager: PackageManager
  projectInfo: {
    tsconfig: any;
    srcDir: boolean;
    appDir: boolean;
    srcComponentsUiDir: boolean;
    componentsUiDir: boolean;
  }
  cliConfig: {
    componentsDirInstallation: string;
    askForDir: boolean;
    utilsLocation: string;
    componentDirAlias: string;
  },
}

const PROJECT_DEPENDENCIES: string[] = [
]

export const addInitCommand = ({ 
    program, 
    packageManager,
    projectInfo,
    cliConfig
  }: AddInitCommandOptions) => {

  program
  .command("init")
  .description("Configure your Vue project.")
  .option("-y, --yes", "Skip confirmation prompt.")
  .action(async (options) => {
    logger.warn(
      "This command assumes a Vue project with TypeScript and Tailwind CSS."
    )
    logger.warn("")

    if (!options.yes) {
      const { proceed } = await prompts({
        type: "confirm",
        name: "proceed",
        message:
          "Running this command will install dependencies and overwrite your existing tailwind.config.js / globals.css. Proceed?",
        initial: true,
      })

      if (!proceed) {
        process.exit(0)
      }
    }

    // Install dependencies.
    if(PROJECT_DEPENDENCIES.length > 0) {
      const dependenciesSpinner = ora(`Installing dependencies...`).start()

      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        ...PROJECT_DEPENDENCIES,
      ])
      dependenciesSpinner.succeed()
    }


    const STYLES_DIRECTORY = './src/assets/styles'

    // Ensure styles directory exists.
    if (!existsSync(path.resolve(STYLES_DIRECTORY))) {
      await fs.mkdir(path.resolve(STYLES_DIRECTORY), { recursive: true })
    }

    // Update styles.css
    let stylesDestination = STYLES_DIRECTORY + '/globals.css'

    const stylesSpinner = ora(`Adding styles with CSS variables...`).start()
    await fs.writeFile(stylesDestination, STYLES, "utf8")
    stylesSpinner.succeed()

    const tailwindDestination = "./tailwind.config.js"
    const tailwindSpinner = ora(`Updating tailwind.config.js...`).start()
    await fs.writeFile(tailwindDestination, TAILWIND_CONFIG, "utf8")
    tailwindSpinner.succeed()

    const allComponents = await getAvailableComponents()
    const globalComponents = allComponents.filter(component => GLOBAL_COMPONENTS.includes(component.name))
    const globalDependentComponents = new Set(addInternalDependencies(
       {selectedComponents: globalComponents, availableComponents: allComponents, addedComponents: []}
      )
    )

    for (const component of Array.from(globalDependentComponents)) {
      await installComponent({
        component,
        options,
        cliConfig,
        packageManager,
      })
    }
  })
}