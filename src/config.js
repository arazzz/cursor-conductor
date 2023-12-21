import { reverseObject } from "./helpers.js";

export const config = {
  sensitivity: 2,
  scrollSensitivity: 1.75,
  brakingFactor: 0.5,

  // For testing
  damp: 6,
  brak: 60,
  norm: 1,
  scro: 1,
  lastTime: null,
  ds: 1,
  mu: 6,
  br: 60,
  a0: 19200,
  vx: 0,
  vy: 0,
  rx: 0,
  ry: 0,
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
