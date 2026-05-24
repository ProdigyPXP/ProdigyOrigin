import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateManifest, type Manifest } from "../lib/manifest.ts";

const VALID: Manifest = {
  schemaVersion: 1,
  patcherVersion: "4.4.0",
  hash: "deadbeef00000000",
  rules: [
    { id: "r1", description: "", find: "a", flags: "g", replace: "b", minMatches: 1 }
  ],
  prefix: "PRE",
  suffix: "POST"
};

describe("validateManifest", () => {
  it("returns the manifest unchanged on a valid object", () => {
    assert.deepEqual(validateManifest(VALID), VALID);
  });

  it("throws on null / non-object input", () => {
    assert.throws(() => validateManifest(null));
    assert.throws(() => validateManifest("not an object"));
    assert.throws(() => validateManifest(123));
  });

  it("throws when schemaVersion is missing or wrong", () => {
    assert.throws(() => validateManifest({ ...VALID, schemaVersion: 2 }));
    assert.throws(() => validateManifest({ ...VALID, schemaVersion: undefined }));
  });

  it("throws when rules is not an array", () => {
    assert.throws(() => validateManifest({ ...VALID, rules: "nope" }));
  });

  it("throws when a rule is missing required fields", () => {
    assert.throws(() => validateManifest({
      ...VALID,
      rules: [{ id: "r1", find: "a" }]
    }));
  });

  it("throws when hash is not a string", () => {
    assert.throws(() => validateManifest({ ...VALID, hash: 123 }));
  });

  it("throws when prefix/suffix are not strings", () => {
    assert.throws(() => validateManifest({ ...VALID, prefix: null }));
    assert.throws(() => validateManifest({ ...VALID, suffix: null }));
  });
});
