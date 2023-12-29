/**
 * @file /src/lib/helpers.js
 * - Contains various helper functions.
 */
import url from "url";
import path from "path";
import consola from "consola";
import { colors as consolaColors } from "consola/utils";

export const logger = consola;
export const colors = consolaColors;

/**
 * Reverses the key-value pairs of an object.
 *
 * @param {object} obj - The object to reverse.
 * @return {object} - The object with reversed key-value pairs.
 */
export const reverseObject = (obj) =>
  Object.entries(obj).reduce((ret, [key, value]) => {
    ret[value] = key;
    return ret;
  }, {});

export const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = path.join(path.dirname(__filename), "..");
