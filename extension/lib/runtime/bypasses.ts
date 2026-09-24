// extension/lib/runtime/bypasses.ts
// Education bypasses, as prototype wraps. Replaces the P-NP regex rules
// answer-question-bypass, external-factory-bypass and open-question-bypass,
// which injected the same early returns into game.min.js source.

import type { AnyClass } from "./resolve"

export type GetConstants = () => Record<string, unknown> | undefined

const EDUCATION_ENABLED = "GameConstants.Debug.EDUCATION_ENABLED"
const CORRECT_PERCENT = "GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT"
const WRAPPED = Symbol.for("playOrigin.wrapped")

type AnyFn = (...args: any[]) => any

const bypassed = (c: Record<string, unknown> | undefined): c is Record<string, unknown> => !!c && !c[EDUCATION_ENABLED]

const rollCorrect = (c: Record<string, unknown>, random: () => number) =>
  random() < ((c[CORRECT_PERCENT] as number) || 1)

// Wraps an *own* prototype method once. Returns false if there is none.
const wrapOwnMethod = (proto: any, name: string, make: (original: AnyFn) => AnyFn): boolean => {
  const original = Object.getOwnPropertyDescriptor(proto, name)?.value
  if (typeof original !== "function") return false
  if ((original as any)[WRAPPED]) return true
  const wrapped = make(original)
  ;(wrapped as any)[WRAPPED] = true
  proto[name] = wrapped
  return true
}

export const installOpenQuestionBypass = (
  cls: AnyClass,
  getConstants: GetConstants,
  random: () => number = Math.random
): boolean =>
  wrapOwnMethod(cls.prototype, "answerQuestion", (original) =>
    function (this: any, ...args: unknown[]) {
      const c = getConstants()
      if (!bypassed(c)) return original.apply(this, args)
      const correct = rollCorrect(c, random)
      this.onQuestionAnswered.dispatch(correct, 0, null)
      if (correct) this.onQuestionAnsweredCorrectly.dispatch(0, null)
      else this.onQuestionAnsweredIncorrectly.dispatch(0, null)
    }
  )

// The action registry is module-private, so catch AnswerQuestion when the
// action factory calls init(data) with data.Type === "AnswerQuestion".
export const installAnswerQuestionActionBypass = (
  baseActionClass: AnyClass,
  getConstants: GetConstants,
  random: () => number = Math.random
): boolean =>
  wrapOwnMethod(baseActionClass.prototype, "init", (originalInit) =>
    function (this: any, ...args: unknown[]) {
      const result = originalInit.apply(this, args)
      const data = args[0] as { Type?: unknown } | null | undefined
      const proto = Object.getPrototypeOf(this)
      if (data?.Type === "AnswerQuestion" && proto !== baseActionClass.prototype) {
        wrapOwnMethod(proto, "execute", (originalExecute) =>
          function (this: any, ...executeArgs: unknown[]) {
            const c = getConstants()
            if (!bypassed(c)) return originalExecute.apply(this, executeArgs)
            this.finish({ answerCorrect: rollCorrect(c, random), responseTime: 0 })
          }
        )
      }
      return result
    }
  )

export const installTowerTownBypass = (cls: AnyClass, getConstants: GetConstants): boolean =>
  wrapOwnMethod(cls.prototype, "openQuestionInterfaceThenEmitNotifications", (original) =>
    function (this: any, ...args: unknown[]) {
      if (!bypassed(getConstants())) return original.apply(this, args)
      const done = args[4]
      if (typeof done === "function") done(true, 10, 1, false, false, {})
    }
  )
