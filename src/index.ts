#!/usr/bin/env node
import { existsSync, promises as fs } from "fs"
import path from "path"
import { Command } from "commander"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"

import { Component, getAvailableComponents } from "./utils/getComponents"
import { Config, getCliConfig } from "./utils/getConfig"
import { getPackageInfo } from "./utils/getPackageInfo"
import { getPackageManager } from "./utils/getPackageManager"
import { getProjectInfo } from "./utils/getProjectInfo"
import { logger } from "./utils/logger"

import {  TAILWIND_CONFIG, STYLES } from "./templates"


process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

const PROJECT_DEPENDENCIES: string[] = [
]

// node ./dist/index.js add button
async function main() {
  const packageInfo = await getPackageInfo()
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
            "Running this command will install dependencies and overwrite your existing tailwind.config.js. Proceed?",
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


      // Ensure styles directory exists.
      if (!projectInfo?.appDir) {
        const stylesDir = projectInfo?.srcDir ? "./src/styles" : "./styles"
        if (!existsSync(path.resolve(stylesDir))) {
          await fs.mkdir(path.resolve(stylesDir), { recursive: true })
        }
      }

      // Update styles.css
      let stylesDestination = projectInfo?.srcDir
        ? "./src/styles/globals.css"
        : "./styles/globals.css"
      if (projectInfo?.appDir) {
        stylesDestination = projectInfo?.srcDir
          ? "./src/app/globals.css"
          : "./app/globals.css"
      }
      const stylesSpinner = ora(`Adding styles with CSS variables...`).start()
      await fs.writeFile(stylesDestination, STYLES, "utf8")
      stylesSpinner.succeed()

      // Ensure lib directory exists.
      const libDir = projectInfo?.srcDir ? "./src/lib" : "./lib"
      if (!existsSync(path.resolve(libDir))) {
        await fs.mkdir(path.resolve(libDir), { recursive: true })
      }

      const tailwindDestination = "./tailwind.config.js"
      const tailwindSpinner = ora(`Updating tailwind.config.js...`).start()
      await fs.writeFile(tailwindDestination, TAILWIND_CONFIG, "utf8")
      tailwindSpinner.succeed()
    })

  program
    .command("add")
    .description("add components to your project")
    .option("-o, --overwrite", "Overwrite existing components.")
    .argument("[components...]", "name of components")
    .action(async (components: string[], options: { overwrite: boolean}) => {
      const availableComponents = await getAvailableComponents()

      if (!availableComponents?.length) {
        logger.error(
          "An error occurred while fetching components. Please try again."
        )
        process.exit(0)
      }

      let selectedComponents = availableComponents.filter((component) =>
        components.includes(component.name) || components.includes(component.component)
      )

      if(components.includes("all") || components.includes("*")) {
        selectedComponents = availableComponents
      }

      if (!selectedComponents?.length) {
        selectedComponents = await promptForComponents(availableComponents)
      }


      if (!selectedComponents?.length) {
        logger.warn("No components selected. Nothing to install.")
        process.exit(0)
      }

      logger.success(
        `Installing ${selectedComponents.length} component(s) and dependencies...`
      )

      // Add all components and their internal dependencies to the list of components to install recursively.
      const allComponents = new Set(addInternalDependenciesToSelectedComponents( {selectedComponents, availableComponents, addedComponents: selectedComponents}))
      for (const component of Array.from(allComponents)) {
        const componentSpinner = ora(`${component.name}...`).start()

        // Write the files.
        for (const file of component.files) {
          const fileDir = `./src/modules/ui/${file.type}/${file.placementDir}`
          // because these are the predefined routes for the utils and components we can
          // use them as a replacer for the defined routes on the installed file.
          file.content = file.content.replace(
            "@/lib/utils",
            cliConfig.utilsLocation
          )
          file.content = file.content.replace(
            `@/components/ui/`,
            cliConfig.componentDirAlias
          )
          if (!existsSync(path.resolve(fileDir))) {
            const spinner = ora(`Creating ${fileDir}...`).start()
            logger.info(`Creating ${path.resolve(fileDir)}...`)
            await fs.mkdir(path.resolve(fileDir), { recursive: true })
            spinner.succeed()

          }

          const filePath = path.resolve(fileDir, file.name)
          if (existsSync(filePath) && !options.overwrite) {
            componentSpinner.warn(`${file.name} already exists. Skipping. Use --overwrite to overwrite existing files`)
            continue
          }
          await fs.writeFile(filePath, file.content)
        }

        // Install dependencies.
        if (component.dependencies?.length) {
          const spinner = ora(`Installing dependencies...`).start()

          await execa(packageManager, [
            packageManager === "npm" ? "install" : "add",
            ...component.dependencies,
          ])
          spinner.succeed(
            `Installed ${component.dependencies.length} dependencies.\n${component.dependencies.join(", ")}`
          )

        }
        componentSpinner.succeed(component.name)
      }
    })

  program.parse()
}

async function promptForComponents(components: Component[]) {
  const { components: selectedComponents } = await prompts({
    type: "autocompleteMultiselect",
    name: "components",
    message: "Which component(s) would you like to add?",
    hint: "Space to select. A to select all. I to invert selection.",
    instructions: false,
    choices: components.map((component) => ({
      title: component.name,
      value: component,
    })),
  })

  return selectedComponents
}


const addInternalDependenciesToSelectedComponents = 
  ({selectedComponents, availableComponents, addedComponents}: 
  { selectedComponents: Component[], availableComponents: Component[], addedComponents: Component[] }) => 
{
  let newComponents: Component[] = []
  selectedComponents.forEach((component) => {
    component?.internalDependencies?.forEach((dependency) => {
      const dependencyComponent = availableComponents.find((component) => component.name === dependency)
      if(dependencyComponent 
        && !addedComponents.find((component) => component.name === dependencyComponent.name)
        && !newComponents.find((component) => component.name === dependencyComponent.name)) 
      {
        newComponents.push(dependencyComponent)
      }
    })
  })
  if(newComponents.length > 0) {
    newComponents = [...selectedComponents, ...newComponents, ...addInternalDependenciesToSelectedComponents({ selectedComponents: newComponents, availableComponents, addedComponents: selectedComponents })]
  } 
  return newComponents
}


main()