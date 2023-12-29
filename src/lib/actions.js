/**
 * @file /src/lib/actions.js
 * - Contains functions for controlling the application's state.
 * - Functions include:
 *   - Registering and unregistering global shortcuts.
 *   - Registering and unregistering mode toggling hotkeys.
 *   - Starting and stopping the uIOhook instance.
 *   - Updating the key pressed state in the base object.
 *   - Toggling the app's activation state.
 */
import { Menu, Tray, dialog, globalShortcut, nativeImage } from "electron";
import assert from "assert";
import path from "path";
import base from "./base.js";
import { openConfig } from "../config/config.js";
import { __dirname } from "./helpers.js";
import packageJSON from "../../package.json" assert { type: "json" };

/**
 * Updates the key pressed state based on the given event and value.
 *
 * @param {Event} e - The event object representing the key press.
 * @param {boolean} value - The value to set the key state to.
 * @return {undefined} - No return value.
 */
export const updateKeyPressedState = (e, value) => {
  const keyMap = base.get("keyMap");
  const config = base.get("config");
  const isAppActive = base.get("isAppActive");
  const key = keyMap[String(e.keycode)];
  if (isAppActive && Object.keys(config.reverseBindings).includes(key)) {
    if (!key) logger.warn(`Unknown key ${e?.keycode}`);
    if (key) base.set(`keyStates.${key}`, value);
  }
};

/**
 * Registers an activation listener for the keyboard.
 *
 * @return {undefined} - No return value.
 */
export const registerActivationListener = () => {
  const config = base.get("config");
  const mainKeyboardListenerHotkey =
    config?.keyboardListenerHotkeys?.toggleActivation || "Alt+`";
  const ret = globalShortcut.register(mainKeyboardListenerHotkey, () =>
    base.set("isKeyboardListenerActive", !base.get("isKeyboardListenerActive"))
  );
  assert(ret, "registration failed");
  assert(
    globalShortcut.isRegistered(mainKeyboardListenerHotkey),
    "registration failed"
  );
};

/**
 * Registers a global shortcut with the specified key and callback.
 *
 * @param {string} key - The key combination for the global shortcut.
 * @param {function} callback - The callback function to be called when the global shortcut is triggered.
 */
export const registerGlobalShortcut = (key, callback) => {
  base.set(`globalShortcuts.${key}`, {
    key,
    callback,
    ret: null,
    register: () => {
      // logger.info(`Registering global shortcut: ${key}`);
      base.set(`keyStates.${key}`, false);
      const ret = globalShortcut.register(key, callback);
      base.set(`globalShortcuts.${key}.ret`, ret);
      assert(ret, "registration failed");
      assert(globalShortcut.isRegistered(key), "registration failed");
    },
    unregister: () => {
      // logger.info(`Unregistering global shortcut: ${key}`);
      base.set(`keyStates.${key}`, false);
      const ret = globalShortcut.unregister(key);
      base.set(`globalShortcuts.${key}.ret`, ret);
      assert(!globalShortcut.isRegistered(key), "unregistration failed");
    },
    isRegistered: () => globalShortcut.isRegistered(key),
  });
  base.get(`globalShortcuts.${key}`).register();
};

/**
 * Unregisters a global shortcut.
 *
 * @param {string} key - The key of the global shortcut to unregister.
 * @return {undefined} - No return value.
 */
export const unregisterGlobalShortcut = (key) =>
  base.get(`globalShortcuts.${key}`).unregister();

/**
 * Unregisters all global shortcuts.
 *
 * @return {undefined} - No return value.
 */
export const unregisterAllGlobalShortcuts = () =>
  globalShortcut.unregisterAll();

/**
 * Stops the uIOhook instance.
 *
 * @param {Object} uIOhook - The uIOhook instance to stop.
 * @return {undefined} - No return value.
 */
export const uIOhookStop = (uIOhook) => {
  if (!base.get("isUIOhookRunning")) return;
  uIOhook.stop();
  base.set("isUIOhookRunning", false);
};

/**
 * Starts the uIOhook.
 *
 * @param {Object} uIOhook - the uIOhook instance to start
 * @return {undefined} - No return value.
 */
export const uIOhookStart = (uIOhook) => {
  if (base.get("isUIOhookRunning")) return;
  uIOhook.start();
  base.set("isUIOhookRunning", true);
};

/**
 * Creates a system tray icon with a context menu for controlling the application.
 *
 * @return {undefined} - No return value.
 */
export const createTray = () => {
  if (!base.get("tray")) {
    let tray = null;
    const iconPath = path.join(__dirname, "./assets/logo.png");
    tray = new Tray(
      nativeImage.createFromPath(iconPath).resize({ width: 256 })
    );
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Config",
        click: () => openConfig(),
      },
      {
        label: "Toggle Activation",
        click: () =>
          base.set(
            "isKeyboardListenerActive",
            !base.get("isKeyboardListenerActive")
          ),
      },
      { type: "separator" },
      {
        label: "About",
        click: () => {
          const { name, version, description } = packageJSON;
          const message = `${name}\n${version}\n\n${description}`;
          const dialogOptions = {
            type: "info",
            title: "About",
            message,
            buttons: ["OK"],
            icon: iconPath,
          };
          dialog.showMessageBoxSync(dialogOptions);
        },
      },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);
    tray.setToolTip("Cursor Conductor");
    tray.setContextMenu(contextMenu);
    base.set("tray", tray);
  }
};
