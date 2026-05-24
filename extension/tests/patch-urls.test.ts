import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANIFEST_URL,
  GAME_SCRIPT_RE,
  isGameScriptSrc,
  gameVersionFromUrl
} from "../lib/patch-urls.ts";

describe("MANIFEST_URL", () => {
  it("points at raw.githubusercontent.com on the v4.4.0-client branch", () => {
    assert.equal(
      MANIFEST_URL,
      "https://raw.githubusercontent.com/ProdigyPXP/P-NP/v4.4.0-client/dist/manifest.json"
    );
  });

  it("uses https", () => {
    assert.ok(MANIFEST_URL.startsWith("https://"));
  });
});

describe("GAME_SCRIPT_RE", () => {
  it("matches the canonical code.prodigygame.com game URL with version path", () => {
    assert.ok(GAME_SCRIPT_RE.test("https://code.prodigygame.com/code/2026.18.1/game.min.js"));
  });

  it("matches with a ?v= query string", () => {
    assert.ok(GAME_SCRIPT_RE.test("https://code.prodigygame.com/code/2026.18.1/game.min.js?v=2026.18.1"));
  });

  it("does not match unrelated scripts", () => {
    assert.ok(!GAME_SCRIPT_RE.test("https://code.prodigygame.com/js/load-game-abc.min.js"));
    assert.ok(!GAME_SCRIPT_RE.test("https://example.com/game.min.js"));
  });
});

describe("isGameScriptSrc", () => {
  it("returns true for the canonical URL", () => {
    assert.equal(
      isGameScriptSrc("https://code.prodigygame.com/code/2026.18.1/game.min.js"),
      true
    );
  });

  it("returns false for empty / null / undefined", () => {
    assert.equal(isGameScriptSrc(""), false);
    assert.equal(isGameScriptSrc(null as unknown as string), false);
    assert.equal(isGameScriptSrc(undefined), false);
  });
});

describe("gameVersionFromUrl", () => {
  it("extracts the version segment from the URL path", () => {
    assert.equal(
      gameVersionFromUrl("https://code.prodigygame.com/code/2026.18.1/game.min.js?v=2026.18.1"),
      "2026.18.1"
    );
  });

  it("extracts even when no query string", () => {
    assert.equal(
      gameVersionFromUrl("https://code.prodigygame.com/code/2026.25.0/game.min.js"),
      "2026.25.0"
    );
  });

  it("returns empty string when path doesn't match", () => {
    assert.equal(gameVersionFromUrl("https://example.com/foo.js"), "");
    assert.equal(gameVersionFromUrl(""), "");
  });
});
