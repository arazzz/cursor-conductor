export const defaultConfig = {
  keyboardDelay: 0,
  mouseDelay: 0,
  modes: {
    1: {
      sensitivity: 40,
      brakingFactor: 0.2,
      scrollSensitivity: 140,
      scrollBrakingFactor: 0.5,
    },
    2: {
      sensitivity: 20,
      brakingFactor: 0.2,
      scrollSensitivity: 140,
      scrollBrakingFactor: 0.5,
      friction: 0.9,
      acceleration: 1,
      decay: 0.99,
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

export default defaultConfig;
