import { describe, it, test } from "node:test";
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
  suffix: "POST",
  defaultMenuUrl: "https://example.com/bundle.js"
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

test("validateManifest accepts defaultMenuUrl", () => {
  const ok = validateManifest({
    schemaVersion: 1,
    patcherVersion: "4.4.1",
    hash: "deadbeefcafebabe",
    rules: [],
    prefix: "P",
    suffix: "S",
    defaultMenuUrl: "https://example.com/bundle.js"
  });
  assert.equal(ok.defaultMenuUrl, "https://example.com/bundle.js");
});

test("validateManifest rejects manifest missing defaultMenuUrl", () => {
  assert.throws(() => validateManifest({
    schemaVersion: 1,
    patcherVersion: "4.4.1",
    hash: "deadbeefcafebabe",
    rules: [],
    prefix: "P",
    suffix: "S"
  }), /defaultMenuUrl/);
});

test("validateManifest rejects non-string defaultMenuUrl", () => {
  assert.throws(() => validateManifest({
    schemaVersion: 1,
    patcherVersion: "4.4.1",
    hash: "deadbeefcafebabe",
    rules: [],
    prefix: "P",
    suffix: "S",
    defaultMenuUrl: 42
  }), /defaultMenuUrl/);
});
