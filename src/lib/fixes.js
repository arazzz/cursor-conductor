/**
 * @file /src/lib/fixes.js
 * - Contains functions for applying fixes to the current state.
 * - Fixes so far include:
 *   - Fixing the tray icon for Elementary OS.
 */
import getLinuxDistro from "linux-distro";

const linuxDistro = process.platform === "linux" && (await getLinuxDistro());

/**
 * Fixes the tray icon for the Elementary OS by setting the `XDG_CURRENT_DESKTOP` environment variable to "Pantheon".
 *
 * @param {undefined} - No parameters needed.
 * @return {undefined} - No return value.
 */
const fixElementaryOSTrayIcon = () => {
  if (String(linuxDistro.os).toLowerCase().includes("elementary"))
    process.env.XDG_CURRENT_DESKTOP = "Pantheon";
};

const fixes = [fixElementaryOSTrayIcon];

/**
 * Apply fixes to the current state.
 *
 * @param {type} fixes - an array of fix functions
 * @return {type} undefined
 */
export const applyFixes = () => {
  fixes.forEach((fix) => fix());
};

export default applyFixes;
