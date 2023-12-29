import url from "url";
import path from "path";
import consola from "consola";
import { colors as consolaColors } from "consola/utils";

export const logger = consola;
export const colors = consolaColors;

export const reverseObject = (obj) =>
  Object.entries(obj).reduce((ret, [key, value]) => {
    ret[value] = key;
    return ret;
  }, {});

export const __filename = url.fileURLToPath(import.meta.url + "../../");
export const __dirname = path.dirname(__filename);
