export const reverseObject = (obj) =>
  Object.entries(obj).reduce((ret, [key, value]) => {
    ret[value] = key;
    return ret;
  }, {});
