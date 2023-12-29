import robot from "@jitsi/robotjs";
import base from "./base.js";
import config from "../config/config.js";
import { logger } from "./helpers.js";

robot.setMouseDelay(0);
robot.setKeyboardDelay(0);

let velocityX = 0;
let velocityY = 0;

export const relMoveMouseWithInertia = ({
  dx = 0,
  dy = 0,
  brakeIsActive = false,
  config: givenConfig = {},
}) => {
  const friction = givenConfig.friction || 0.9;
  const acceleration = givenConfig.acceleration || 1;
  const decay = givenConfig.decay || 0.99;

  const frictionApplied = brakeIsActive ? 0.8 : friction;

  const relMoveMouseInterval = setInterval(() => {
    const { x: x0, y: y0 } = robot.getMousePos();

    // Apply inertia
    velocityX *= frictionApplied;
    velocityY *= frictionApplied;

    // Apply exponential decay
    velocityX *= decay;
    velocityY *= decay;

    const x1 = Math.round(x0 + velocityX);
    const y1 = Math.round(y0 + velocityY);

    robot.moveMouse(x1, y1);

    // Reset velocity
    if (Math.abs(velocityX) < 1) velocityX = 0;
    if (Math.abs(velocityY) < 1) velocityY = 0;

    if (velocityX === 0 && velocityY === 0) {
      clearInterval(relMoveMouseInterval);
    }
  }, 1000 / 60); // Run the function 60 times per second

  // Apply acceleration
  velocityX += dx * acceleration;
  velocityY += dy * acceleration;

  return () => clearInterval(relMoveMouseInterval);
};

export const relMoveMouse = ({ dx = 0, dy = 0 }) => {
  const { x: x0, y: y0 } = robot.getMousePos();
  const x1 = Math.round(x0 + dx);
  const y1 = Math.round(y0 + dy);
  robot.moveMouse(x1, y1);
};

export const mouseMovementHandler = ({
  dx = 0,
  dy = 0,
  brakeIsActive = false,
  scrollIsActive = false,
  scrollDx = 0,
  scrollDy = 0,
}) => {
  try {
    const currentMode = base.get("currentMode");
    let sensitivity = config.modes[currentMode].sensitivity;
    let scrollSensitivity = config.modes[currentMode].scrollSensitivity;
    if (brakeIsActive) {
      sensitivity =
        config.modes[currentMode].sensitivity *
        config.modes[currentMode].brakingFactor;
      scrollSensitivity =
        config.modes[currentMode].scrollSensitivity *
        config.modes[currentMode].scrollBrakingFactor;
    }
    if (scrollIsActive) {
      scrollDx *= scrollSensitivity;
      scrollDy *= scrollSensitivity;
      robot.scrollMouse(scrollDx, scrollDy);
    } else if (dx || dy) {
      dx *= sensitivity;
      dy *= sensitivity;
      if (currentMode === 1) {
        relMoveMouse({ dx, dy });
      } else if (currentMode === 2) {
        relMoveMouseWithInertia({
          dx,
          dy,
          brakeIsActive,
          config: config.modes[currentMode],
        });
      }
    }
  } catch (err) {
    logger.error(
      `Failed to move mouse: ${err.message} \n ${err.stack || err.toString()}`
    );
    throw err;
  }
};
