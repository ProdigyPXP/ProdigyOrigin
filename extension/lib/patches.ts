export type PatchRule = {
  id: string
  description: string
  find: string
  flags: string
  replace: string
  minMatches: number
}

export type ApplyPatchRulesOutcome = {
  output: string
  perRuleCounts: Record<string, number>
}

export const applyPatchRules = (
  source: string,
  rules: ReadonlyArray<PatchRule>
): ApplyPatchRulesOutcome => {
  const perRuleCounts: Record<string, number> = {}
  let output = source
  for (const rule of rules) {
    const re = new RegExp(rule.find, rule.flags)
    let count = 0
    output = output.replace(re, (...args) => {
      count += 1
      const groups = args.slice(1, -2)
      let result = rule.replace
      groups.forEach((g, i) => {
        result = result.replace(new RegExp("\\$" + (i + 1), "g"), g ?? "")
      })
      return result
    })
    perRuleCounts[rule.id] = count
  }
  return { output, perRuleCounts }
}

export const wrapWithPrefixSuffix = (
  body: string,
  prefix: string,
  suffix: string
): string => `${prefix}\n${body}\n${suffix}`
