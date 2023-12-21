import consola from "consola";

export const logger = consola;

export const reverseObject = (obj) =>
  Object.entries(obj).reduce((ret, [key, value]) => {
    ret[value] = key;
    return ret;
  }, {});
