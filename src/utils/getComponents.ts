import { HttpsProxyAgent } from "https-proxy-agent"
import fetch from "node-fetch"
import * as z from "zod"
import { GLOBAL_COMPONENTS } from ".."

const baseUrl = process.env.COMPONENTS_BASE_URL ?? "https://wisemen-components.netlify.app/"
const agent = process.env.https_proxy
  ? new HttpsProxyAgent(process.env.https_proxy)
  : undefined


export const fileTypeSchema = z.enum(['components', 'composables', 'utils', 'icons', 'transitions'])
const componentSchema = z.object({
  component: z.string(),
  name: z.string(),
  dependencies: z.array(z.string()).optional(),
  internalDependencies: z.array(z.string()).optional(),
  files: z.array(
    z.object({
      name: z.string(),
      dir: z.string(),
      content: z.string(),
      placementDir: z.string(),
      type: fileTypeSchema
    })
  ),
})

export type Component = z.infer<typeof componentSchema>
export type FileType = z.infer<typeof fileTypeSchema>
const componentsSchema = z.array(componentSchema)

export async function getAvailableComponents() {
  try {
    const response = await fetch(`${baseUrl}/api/components.json`, { agent })
    const components = await response.json()

    return componentsSchema.parse(components)

  } catch (error) {
    throw new Error(
      `Failed to fetch components from ${baseUrl}/api/components.json.`
    )
  }
}