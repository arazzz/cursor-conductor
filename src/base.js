import _ from "lodash";

class Base {
  constructor() {
    this.data = {
      isKeyboardListenerActive: false,
      keyStates: {},
      globalShortcuts: {},
    };
    this.listeners = [];
  }

  get(key) {
    return _.get(this.data, key);
  }

  set(key, value) {
    const changed = this.data[key] !== value;
    // this.data[key] = value;
    _.set(this.data, key, value);
    this.listeners.forEach((listener) =>
      listener({
        key,
        value,
        changed,
      })
    );
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    };
  }

  unsubscribeAll() {
    this.listeners = [];
  }

  unsubscribe(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  on(key, callback, options = { onlyOnChange: false }) {
    // const { once, debounce, throttle, onlyOnChange } = options;
    const { onlyOnChange } = options;
    return this.subscribe(({ key: _key, value, changed }) => {
      if (onlyOnChange) {
        if (key === _key && changed) callback(value);
      } else {
        if (_key === key) callback({ value, changed });
      }
    });
  }

  onChange(key, callback, options = {}) {
    return this.on(key, callback, { onlyOnChange: true, ...options });
  }
}

const base = new Base();

export { Base, base };

export default base;
