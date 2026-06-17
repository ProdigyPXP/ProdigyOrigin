import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyPatchRules, wrapWithPrefixSuffix, type PatchRule } from "../lib/patches.ts";

const singletonRule: PatchRule = {
  id: "singleton-exposure",
  description: "",
  find: "(_instance=this\\),this\\._game=([A-Za-z_$][\\w$]*)\\}destroy\\(\\)\\{)",
  flags: "",
  replace: "_instance=this),window.__PNP__=this,this._game=$2}destroy(){",
  minMatches: 1
};

const safeBindRule: PatchRule = {
  id: "safe-bind",
  description: "",
  find: "([A-Za-z_$][\\w$]*\\.q\\.instance\\.prodigy\\.gameContainer)\\.bind\\(",
  flags: "g",
  replace: "window.__pnp_safeBind($1,",
  minMatches: 1
};

describe("applyPatchRules", () => {
  it("applies a rule with first-match semantics (no g flag)", () => {
    const input = `class X{constructor(){_instance=this),this._game=E}destroy(){}}`;
    const { output, perRuleCounts } = applyPatchRules(input, [singletonRule]);
    assert.equal(perRuleCounts["singleton-exposure"], 1);
    assert.ok(output.includes("window.__PNP__=this"));
  });

  it("applies a rule with all-match semantics (g flag)", () => {
    const input = `A.q.instance.prodigy.gameContainer.bind("a"); B.q.instance.prodigy.gameContainer.bind("b");`;
    const { output, perRuleCounts } = applyPatchRules(input, [safeBindRule]);
    assert.equal(perRuleCounts["safe-bind"], 2);
    assert.ok(output.includes("window.__pnp_safeBind(A.q.instance.prodigy.gameContainer,"));
    assert.ok(output.includes("window.__pnp_safeBind(B.q.instance.prodigy.gameContainer,"));
  });

  it("applies rules in order", () => {
    const a: PatchRule = { id: "a", description: "", find: "foo", flags: "g", replace: "FOO", minMatches: 1 };
    const b: PatchRule = { id: "b", description: "", find: "FOO", flags: "g", replace: "BAR", minMatches: 1 };
    const { output } = applyPatchRules("foo", [a, b]);
    assert.equal(output, "BAR");
  });

  it("reports zero matches without throwing", () => {
    const { output, perRuleCounts } = applyPatchRules("nothing", [singletonRule]);
    assert.equal(perRuleCounts["singleton-exposure"], 0);
    assert.equal(output, "nothing");
  });
});

describe("wrapWithPrefixSuffix", () => {
  it("prepends prefix and appends suffix", () => {
    const out = wrapWithPrefixSuffix("BODY", "PRE", "POST");
    assert.equal(out, "PRE\nBODY\nPOST");
  });

  it("preserves the body verbatim", () => {
    const body = "(function(){var x=1;})();";
    const out = wrapWithPrefixSuffix(body, "P", "S");
    assert.ok(out.includes(body));
  });
});
