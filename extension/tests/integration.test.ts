import { describe, it, test } from "node:test"
import assert from "node:assert/strict"
import { applyPatchRules, wrapWithPrefixSuffix, type PatchRule } from "../lib/patches.ts"
import { validateManifest } from "../lib/manifest.ts"

const SYNTHETIC_MANIFEST = {
  schemaVersion: 1,
  patcherVersion: "4.4.0",
  hash: "abc123def4567890",
  prefix: "/* PRE */",
  suffix: "/* POST */",
  defaultMenuUrl: "https://example.com/bundle.js",
  rules: [
    {
      id: "singleton-exposure",
      description: "",
      find: "(_instance=this\\),this\\._game=([A-Za-z_$][\\w$]*)\\}destroy\\(\\)\\{)",
      flags: "",
      replace: "_instance=this),window.__PNP__=this,this._game=$2}destroy(){",
      minMatches: 1
    },
    {
      id: "safe-bind",
      description: "",
      find: "([A-Za-z_$][\\w$]*\\.q\\.instance\\.prodigy\\.gameContainer)\\.bind\\(",
      flags: "g",
      replace: "window.__pnp_safeBind($1,",
      minMatches: 1
    }
  ] as PatchRule[]
}

const ORIGINAL = `
class Prodigy{constructor(E){_instance=this),this._game=E}destroy(){}}
class X{thing(){return A.q.instance.prodigy.gameContainer.bind("MathTower");}}
class Y{other(){return B.q.instance.prodigy.gameContainer.bind("Other");}}
`

describe("end-to-end: validateManifest → applyPatchRules → wrapWithPrefixSuffix", () => {
  it("produces a wrapped bundle with prefix, patched core, and suffix", () => {
    const manifest = validateManifest(SYNTHETIC_MANIFEST)
    const { output: patched, perRuleCounts } = applyPatchRules(ORIGINAL, manifest.rules)

    assert.equal(perRuleCounts["singleton-exposure"], 1)
    assert.equal(perRuleCounts["safe-bind"], 2)
    assert.ok(patched.includes("window.__PNP__=this"))
    assert.ok(patched.includes("window.__pnp_safeBind(A.q.instance.prodigy.gameContainer,"))
    assert.ok(patched.includes("window.__pnp_safeBind(B.q.instance.prodigy.gameContainer,"))

    const wrapped = wrapWithPrefixSuffix(patched, manifest.prefix, manifest.suffix)
    assert.ok(wrapped.startsWith("/* PRE */"))
    assert.ok(wrapped.endsWith("/* POST */\n") || wrapped.endsWith("/* POST */"))
    assert.ok(wrapped.includes("window.__PNP__=this"))
  })

  it("validateManifest rejects a malformed payload", () => {
    assert.throws(() => validateManifest({ ...SYNTHETIC_MANIFEST, schemaVersion: 99 }))
  })
})

test("menu-URL prefix is prepended to wrapped bundle", () => {
  const wrapped = wrapWithPrefixSuffix("body", "prefix", "suffix");
  const menuUrl = "https://example.com/m.js";
  const finalBundle =
    `globalThis.__ORIGIN_MENU_URL__=${JSON.stringify(menuUrl)};\n${wrapped}`;
  assert.ok(finalBundle.startsWith(
    `globalThis.__ORIGIN_MENU_URL__="https://example.com/m.js";\n`
  ));
  assert.ok(finalBundle.includes("prefix\nbody\nsuffix"));
});

test("override URL takes priority over manifest.defaultMenuUrl", () => {
  const manifest = { defaultMenuUrl: "https://default.example/m.js" };
  const override = "https://custom.example/m.js";
  const resolved = override || manifest.defaultMenuUrl;
  assert.equal(resolved, "https://custom.example/m.js");

  const emptyOverride: string = "";
  const resolved2 = emptyOverride || manifest.defaultMenuUrl;
  assert.equal(resolved2, "https://default.example/m.js");
});
