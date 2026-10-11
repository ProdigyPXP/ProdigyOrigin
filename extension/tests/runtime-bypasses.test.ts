// extension/tests/runtime-bypasses.test.ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  installAnswerQuestionActionBypass,
  installOpenQuestionBypass,
  installTowerTownBypass
} from "../lib/runtime/bypasses.ts"

const EDU = "GameConstants.Debug.EDUCATION_ENABLED"
const PCT = "GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT"

const signal = () => {
  const calls: unknown[][] = []
  return { calls, dispatch: (...args: unknown[]) => { calls.push(args) } }
}

const makeOpenQuestionClass = () =>
  class OpenQuestionInterface {
    onQuestionAnswered = signal()
    onQuestionAnsweredCorrectly = signal()
    onQuestionAnsweredIncorrectly = signal()
    opened = 0
    answerQuestion() { this.opened++ }
  }

describe("installOpenQuestionBypass", () => {
  it("runs the original when education is enabled", () => {
    const C = makeOpenQuestionClass()
    const constants: Record<string, unknown> = { [EDU]: true, [PCT]: 1 }
    installOpenQuestionBypass(C, () => constants)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 1)
    assert.equal(q.onQuestionAnswered.calls.length, 0)
  })

  it("answers correctly without opening when education is disabled", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => ({ [EDU]: false, [PCT]: 1 }), () => 0)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 0)
    assert.deepEqual(q.onQuestionAnswered.calls, [[true, 0, null]])
    assert.deepEqual(q.onQuestionAnsweredCorrectly.calls, [[0, null]])
    assert.equal(q.onQuestionAnsweredIncorrectly.calls.length, 0)
  })

  it("answers incorrectly when the roll misses the percentage", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => ({ [EDU]: false, [PCT]: 0.5 }), () => 0.9)
    const q = new C()
    q.answerQuestion()
    assert.deepEqual(q.onQuestionAnswered.calls, [[false, 0, null]])
    assert.deepEqual(q.onQuestionAnsweredIncorrectly.calls, [[0, null]])
  })

  it("follows the flag live: bypass off again once education is re-enabled", () => {
    const C = makeOpenQuestionClass()
    const constants: Record<string, unknown> = { [EDU]: false }
    installOpenQuestionBypass(C, () => constants, () => 0)
    const q = new C()
    q.answerQuestion()
    constants[EDU] = true
    q.answerQuestion()
    assert.equal(q.opened, 1)
  })

  it("runs the original while constants are unresolved", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => undefined)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 1)
  })

  it("wraps once", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => undefined)
    const first = C.prototype.answerQuestion
    assert.equal(installOpenQuestionBypass(C, () => undefined), true)
    assert.equal(C.prototype.answerQuestion, first)
  })

  it("returns false when the method is missing", () => {
    assert.equal(installOpenQuestionBypass(class {}, () => undefined), false)
  })
})

describe("installAnswerQuestionActionBypass", () => {
  const make = () => {
    class BaseAction {
      data: any = null
      finished: unknown = undefined
      init(data: any) { this.data = data }
      execute() {}
      finish(result: unknown) { this.finished = result }
      findParameter() { return null }
      validateParameters() { return true }
    }
    class AnswerQuestion extends BaseAction { executed = false; execute() { this.executed = true } }
    class Other extends BaseAction { executed = false; execute() { this.executed = true } }
    return { BaseAction, AnswerQuestion, Other }
  }

  it("finishes AnswerQuestion actions without asking when education is disabled", () => {
    const { BaseAction, AnswerQuestion } = make()
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: false }), () => 0)
    const a = new AnswerQuestion()
    a.init({ Type: "AnswerQuestion" })
    a.execute()
    assert.equal(a.executed, false)
    assert.deepEqual(a.finished, { answerCorrect: true, responseTime: 0 })
  })

  it("runs the original AnswerQuestion when education is enabled", () => {
    const { BaseAction, AnswerQuestion } = make()
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: true }))
    const a = new AnswerQuestion()
    a.init({ Type: "AnswerQuestion" })
    a.execute()
    assert.equal(a.executed, true)
  })

  it("leaves other actions and the base execute alone", () => {
    const { BaseAction, Other } = make()
    const baseExecute = BaseAction.prototype.execute
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: false }))
    const o = new Other()
    o.init({ Type: "Other" })
    o.execute()
    assert.equal(o.executed, true)
    assert.equal(BaseAction.prototype.execute, baseExecute)
  })
})

describe("installTowerTownBypass", () => {
  class TowerTown {
    opened = 0
    openQuestionInterfaceThenEmitNotifications(_e: unknown, _w: unknown, _t: unknown, _s: unknown, _cb?: Function) { this.opened++ }
  }

  it("calls the completion callback as a correct answer", () => {
    installTowerTownBypass(TowerTown, () => ({ [EDU]: false }))
    const t = new TowerTown()
    const calls: unknown[][] = []
    t.openQuestionInterfaceThenEmitNotifications(1, true, null, false, (...a: unknown[]) => calls.push(a))
    assert.equal(t.opened, 0)
    assert.deepEqual(calls, [[true, 10, 1, false, false, {}]])
  })

  it("tolerates a missing callback", () => {
    installTowerTownBypass(TowerTown, () => ({ [EDU]: false }))
    assert.doesNotThrow(() => new TowerTown().openQuestionInterfaceThenEmitNotifications(1, true, null, false))
  })
})
