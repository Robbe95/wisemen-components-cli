
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
import { Config, getConfig, getRawConfig, rawConfigSchema, resolveConfigPaths } from "../utils/getConfig"
import chalk from "chalk"
import { getFileAndDirectoryFromPath } from "../utils/getFileAndDirectoryFromPath"


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
  cliConfig: Config | null
}

const PROJECT_DEPENDENCIES: string[] = [
  '@appwise/forms',
  'class-variance-authority',
  'tailwind-merge',
  'zod',
]

export const DEFAULT_STYLE = "default"
export const DEFAULT_COMPONENTS = "@/components"
export const DEFAULT_UTILS = "@/lib/utils"
export const DEFAULT_TAILWIND_CSS = "src/assets/styles/globals.css"
export const DEFAULT_TAILWIND_CONFIG = "tailwind.config.js"
export const DEFAULT_COMPOSABLES = "@/composables"
export const DEFAULT_TRANSITIONS = "@/transitions"
export const DEFAULT_ICONS = "@/icons"

const highlight = (text: string) => chalk.cyan(text)

const promptForConfig = async (optionsCwd: any) => {
  if (!optionsCwd.yes) {
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

  const options = await prompts([
    {
      type: "text",
      name: "tailwindCss",
      message: `Where is your ${highlight("global CSS")} file?`,
      initial: DEFAULT_TAILWIND_CSS,
    },
    {
      type: "text",
      name: "tailwindConfig",
      message: `Where is your ${highlight("tailwind.config.js")} located?`,
      initial: DEFAULT_TAILWIND_CONFIG,
    },
    {
      type: "text",
      name: "components",
      message: `Configure the import alias for ${highlight("components")}:`,
      initial: DEFAULT_COMPONENTS,
    },
    {
      type: "text",
      name: "utils",
      message: `Configure the import alias for ${highlight("utils")}:`,
      initial: DEFAULT_UTILS,
    },
    {
      type: "text",
      name: "composables",
      message: `Configure the import alias for ${highlight("composables")}:`,
      initial: DEFAULT_COMPOSABLES,
    },
    {
      type: "text",
      name: "transitions",
      message: `Configure the import alias for ${highlight("transitions")}:`,
      initial: DEFAULT_TRANSITIONS,
    },
    {
      type: "text",
      name: "icons",
      message: `Configure the import alias for ${highlight("icons")}:`,
      initial: DEFAULT_ICONS,
    },
  ])


  const config = rawConfigSchema.parse({
    $schema: "https://wisemen-components.netlify.app/api/components.json",
    style: 'wisemen',
    tailwind: {
      config: options.tailwindConfig,
      css: options.tailwindCss,
    },
    aliases: {
      utils: options.utils,
      components: options.components,
      composables: options.composables,
      transitions: options.transitions,
      icons: options.icons,
    },
  })
  
  const targetPath = path.resolve("components.json")
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf8")

  return await resolveConfigPaths('./', config)
}

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

    const config = await getConfig('/')
    if(config) {
      logger.error('Project already configured.')
    }
    logger.info("No config found. Setting up new config.")

  
    const configOptions = await promptForConfig(options)
    // Install dependencies.
    if(PROJECT_DEPENDENCIES.length > 0) {
      const dependenciesSpinner = ora(`Installing dependencies...`).start()

      await execa(packageManager, [
        packageManager === "npm" ? "install" : "add",
        ...PROJECT_DEPENDENCIES,
      ])
      dependenciesSpinner.succeed()
    }


    const { directory: STYLES_DIRECTORY, fileName: STYLES_FILE } = getFileAndDirectoryFromPath(configOptions.tailwind.css)
    const { directory: TAILWIND_DIRECTORY, fileName: TAILWIND_FILE } = getFileAndDirectoryFromPath(configOptions.tailwind.config)

    // Add styles.
    if (!existsSync(path.resolve(STYLES_DIRECTORY))) {
      await fs.mkdir(path.resolve(STYLES_DIRECTORY), { recursive: true })
    }

    let stylesDestination = STYLES_DIRECTORY + '/' + STYLES_FILE

    const stylesSpinner = ora(`Adding styles with CSS variables...`).start()
    await fs.writeFile(stylesDestination, STYLES, "utf8")
    stylesSpinner.succeed()

    // Add tailwind config.
    if (!existsSync(path.resolve(TAILWIND_DIRECTORY))) {
      await fs.mkdir(path.resolve(TAILWIND_DIRECTORY), { recursive: true })
    }

    const tailwindDestination = TAILWIND_DIRECTORY + '/' + TAILWIND_FILE

    const tailwindSpinner = ora(`Updating tailwind.config.js...`).start()
    await fs.writeFile(tailwindDestination, TAILWIND_CONFIG, "utf8")
    tailwindSpinner.succeed()

    // Add global components.
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
        cliConfig: configOptions,
        packageManager,
        inRoot: true,
      })
    }
  })
}