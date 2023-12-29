import { get as _get, set as _set } from "lodash-es";

class Base {
  constructor() {
    this.data = {
      isKeyboardListenerActive: false,
      currentMode: 1,
      keyStates: {},
      mouseStates: {},
      globalShortcuts: {},
      isUIOhookRunning: false,
    };
    this.listeners = [];
  }

  get(key) {
    return _get(this.data, key);
  }

  set(key, value) {
    const changed = this.data[key] !== value;
    // this.data[key] = value;
    _set(this.data, key, value);
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

  unsubscribeAllButActivationListener() {
    this.listeners = [this.listeners[0]];
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

  getAllListeners() {
    return this.listeners;
  }
}

const base = new Base();

export { Base, base };

export default base;
