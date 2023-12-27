import { reverseObject } from "./helpers.js";

export const config = {
  modes: {
    1: {
      sensitivity: 40,
      brakingFactor: 0.2,
      scrollSensitivity: 2,
      scrollBrakingFactor: 0.5,
    },
    2: {
      sensitivity: 20,
      brakingFactor: 0.2,
      scrollSensitivity: 2,
      scrollBrakingFactor: 0.5,
    },
  },
  keyboardListenerHotkeys: {
    toggleActivation: "Alt+`",
    activateMode1: "Ctrl+Alt+1", // Does not use inertia
    activateMode2: "Ctrl+Alt+2", // Uses inertia
  },
  bindings: {
    up: "I",
    down: "K",
    left: "J",
    right: "L",
    mb1: "F",
    mb2: "E",
    mb3: "R",
    brake: "S",
    scroll: "Space",
  },
};

config.reverseBindings = reverseObject(config.bindings);

export default config;
