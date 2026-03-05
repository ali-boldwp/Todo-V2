#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

const PLUGIN_ROOT = "apps/webstorm-plugin";
const PLUGIN_SRC_PREFIX = `${PLUGIN_ROOT}/src/main/`;
const GRADLE_FILE = `${PLUGIN_ROOT}/build.gradle.kts`;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function extractVersion(content) {
  const match = content.match(/^\s*version\s*=\s*"([^"]+)"/m);
  return match ? match[1].trim() : "";
}

function main() {
  // Allow opt-out for exceptional scenarios.
  if (process.env.SKIP_PLUGIN_VERSION_CHECK === "1") {
    console.log("[plugin-version-check] skipped (SKIP_PLUGIN_VERSION_CHECK=1)");
    return;
  }

  try {
    const changed = run(`git diff --name-only HEAD -- "${PLUGIN_ROOT}"`)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const pluginCodeChanged = changed.some((file) => file.startsWith(PLUGIN_SRC_PREFIX));
    if (!pluginCodeChanged) return;

    const currentGradle = fs.readFileSync(GRADLE_FILE, "utf8");
    const currentVersion = extractVersion(currentGradle);
    if (!currentVersion) {
      throw new Error(`Could not read plugin version from ${GRADLE_FILE}`);
    }

    let headGradle;
    try {
      headGradle = run(`git show HEAD:${GRADLE_FILE}`);
    } catch {
      console.log("[plugin-version-check] no HEAD baseline for plugin version; skipping check.");
      return;
    }

    const previousVersion = extractVersion(headGradle);
    if (!previousVersion) {
      console.log("[plugin-version-check] could not read previous plugin version; skipping check.");
      return;
    }

    if (previousVersion === currentVersion) {
      console.error("");
      console.error("[plugin-version-check] WebStorm plugin code changed but plugin version was not bumped.");
      console.error(`  file: ${GRADLE_FILE}`);
      console.error(`  current version: ${currentVersion}`);
      console.error(`  previous version: ${previousVersion}`);
      console.error("  action: update `version = \"...\"` in build.gradle.kts before building.");
      console.error("");
      process.exit(1);
    }
  } catch (error) {
    // Do not block development if git is unavailable in an environment.
    const message = (error && error.message) ? error.message : String(error);
    console.log(`[plugin-version-check] skipped (${message})`);
  }
}

main();
