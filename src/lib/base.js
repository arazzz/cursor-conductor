/**
 * @file /src/lib/base.js
 * - Contains the Base class, which is responsible for storing the app's state
 *   and notifying listeners of changes to the state.
 */
import { get as _get, set as _set } from "lodash-es";
import { UiohookKey } from "uiohook-napi";
import defaultConfig from "../config/config.default.js";
import { reverseObject } from "./helpers.js";

class Base {
  /**
   * Initializes the object with default data and listeners.
   */
  constructor() {
    this.data = {
      isAppActive: false,
      isKeyboardListenerActive: false,
      config: { ...defaultConfig },
      keyMap: reverseObject(UiohookKey),
      currentMode: 1,
      keyStates: {},
      prevKeyStates: {},
      mouseStates: {},
      globalShortcuts: {},
      isUIOhookRunning: false,
      tray: null,
    };
    this.listeners = [];
  }

  /**
   * Retrieve a value from the data object using the specified key.
   *
   * @param {type} key - the key used to retrieve the value from the data object
   * @return {type} the value associated with the specified key
   */
  get(key) {
    return _get(this.data, key);
  }

  /**
   * Sets the value of a key in the data object and notifies all listeners.
   *
   * @param {string} key - The key to set the value for.
   * @param {any} value - The value to set for the key.
   * @return {undefined} - No return value.
   */
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

  /**
   * Adds a listener to the list of listeners.
   *
   * @param {function} listener - The listener function to be added.
   * @return {function} - A function that removes the listener from the list.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    };
  }

  /**
   * Unsubscribes all listeners.
   * @return {undefined} - No return value.
   */
  unsubscribeAll() {
    this.listeners = [];
  }

  /**
   * Removes a listener from the array of listeners.
   *
   * @param {any} listener - The listener to be removed.
   * @return {undefined} - No return value.
   */
  unsubscribe(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  /**
   * Unsubscribes all listeners except the activation listener.
   *
   * @return {undefined} - No return value.
   */
  unsubscribeAllButActivationListener() {
    this.listeners = [this.listeners[0]];
  }

  /**
   * Subscribes a callback function to changes on a specific key.
   *
   * @param {string} key - The key to subscribe to.
   * @param {function} callback - The callback function to be executed when the key changes.
   * @param {object} options - The options object.
   * @param {boolean} options.onlyOnChange - If set to true, the callback will only be executed if the key has changed.
   * @return {function} - The unsubscribe function.
   */
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

  /**
   * A description of the entire function.
   *
   * @param {type} key - description of the key parameter
   * @param {type} callback - description of the callback parameter
   * @param {Object} options - description of the options parameter (default: {})
   * @return {type} description of the return value
   */
  onChange(key, callback, options = {}) {
    return this.on(key, callback, { onlyOnChange: true, ...options });
  }

  /**
   * Get all the listeners.
   *
   * @return {Array} The array of listeners.
   */
  getAllListeners() {
    return this.listeners;
  }
}

const base = new Base();

export { Base, base };

export default base;
