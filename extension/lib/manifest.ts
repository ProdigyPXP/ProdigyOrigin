import type { PatchRule } from "./patches"

export type Manifest = {
  schemaVersion: 1
  patcherVersion: string
  hash: string
  rules: PatchRule[]
  prefix: string
  suffix: string
  defaultMenuUrl: string
}

const isPatchRule = (v: unknown): v is PatchRule => {
  if (!v || typeof v !== "object") return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === "string" &&
    typeof r.description === "string" &&
    typeof r.find === "string" &&
    typeof r.flags === "string" &&
    typeof r.replace === "string" &&
    typeof r.minMatches === "number"
  )
}

export const validateManifest = (value: unknown): Manifest => {
  if (!value || typeof value !== "object") {
    throw new Error("manifest.json must be a JSON object")
  }
  const m = value as Record<string, unknown>
  if (m.schemaVersion !== 1) {
    throw new Error(`manifest.schemaVersion must be 1 (got ${m.schemaVersion as unknown as string})`)
  }
  if (typeof m.patcherVersion !== "string") {
    throw new Error("manifest.patcherVersion must be a string")
  }
  if (typeof m.hash !== "string") {
    throw new Error("manifest.hash must be a string")
  }
  if (!Array.isArray(m.rules) || !m.rules.every(isPatchRule)) {
    throw new Error("manifest.rules must be an array of PatchRule")
  }
  if (typeof m.prefix !== "string") {
    throw new Error("manifest.prefix must be a string")
  }
  if (typeof m.suffix !== "string") {
    throw new Error("manifest.suffix must be a string")
  }
  if (typeof m.defaultMenuUrl !== "string") {
    throw new Error("manifest.defaultMenuUrl must be a string")
  }
  return m as unknown as Manifest
}
