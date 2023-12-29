import consola from "consola";
import { colors as consolaColors } from "consola/utils";

export const logger = consola;
export const colors = consolaColors;

export const reverseObject = (obj) =>
  Object.entries(obj).reduce((ret, [key, value]) => {
    ret[value] = key;
    return ret;
  }, {});
