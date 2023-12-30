/**
 * @file /src/lib/mouseActions.js
 *  - Contains functions for mouse actions such as mouse movement,
 *    mouse button presses, and mouse button releases.
 */
import robot from "@jitsi/robotjs";
import base from "./base.js";
import { logger } from "./helpers.js";

let velocityX = 0;
let velocityY = 0;

/**
 * Sets the delay for mouse and keyboard actions.
 *
 * @param {object} options - The options for setting the delay.
 * @param {number} options.mouseDelay - The delay for mouse actions.
 * @param {number} options.keyboardDelay - The delay for keyboard actions.
 * @returns {undefined} - No return value.
 */
export const setMouseAndKeyboardDelay = ({
  mouseDelay = 0,
  keyboardDelay = 0,
}) => {
  robot.setMouseDelay(mouseDelay);
  robot.setKeyboardDelay(keyboardDelay);
};

// Set mouse and keyboard delay to 0 to make the actions instantaneous.
setMouseAndKeyboardDelay({ mouseDelay: 0, keyboardDelay: 0 });

/**
 * Moves the mouse with inertia based on the given relative distance values.
 *
 * @param {Object} options - The options for the mouse movement.
 * @param {number} options.dx - The relative distance to move the mouse in the x-axis. Default is 0.
 * @param {number} options.dy - The relative distance to move the mouse in the y-axis. Default is 0.
 * @param {boolean} options.brakeIsActive - Flag indicating if the brake is active. Default is false.
 * @param {Object} options.config - Additional configuration for the mouse movement.
 * @param {number} options.config.friction - The friction applied to the mouse movement. Default is 0.9.
 * @param {number} options.config.acceleration - The acceleration applied to the mouse movement. Default is 1.
 * @param {number} options.config.decay - The exponential decay applied to the mouse movement. Default is 0.99.
 * @returns {Function} A function that clears the interval of the mouse movement.
 */
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

    // const x1 = Math.round(x0 + velocityX);
    // const y1 = Math.round(y0 + velocityY);
    const x1 = x0 + velocityX;
    const y1 = y0 + velocityY;

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

/**
 * Moves the mouse relative to its current position.
 *
 * @param {Object} options - The options for the relative movement.
 * @param {number} options.dx - The change in the x-coordinate of the mouse.
 * @param {number} options.dy - The change in the y-coordinate of the mouse.
 */
export const relMoveMouse = ({ dx = 0, dy = 0 }) => {
  const { x: x0, y: y0 } = robot.getMousePos();
  const x1 = Math.round(x0 + dx);
  const y1 = Math.round(y0 + dy);
  robot.moveMouse(x1, y1);
};

/**
 * Handles mouse movement based on the provided parameters.
 *
 * @param {Object} params - An object containing the following parameters:
 *   @param {number} params.dx - The change in the x-coordinate of the mouse.
 *   @param {number} params.dy - The change in the y-coordinate of the mouse.
 *   @param {boolean} params.brakeIsActive - Indicates if the brake is active.
 *   @param {boolean} params.scrollIsActive - Indicates if the scroll is active.
 *   @param {number} params.scrollDx - The change in the x-coordinate of the scroll.
 *   @param {number} params.scrollDy - The change in the y-coordinate of the scroll.
 *   @param {Object} params.config - An object containing configuration settings.
 * @throws {Error} If an error occurs while moving the mouse.
 */
export const mouseMovementHandler = ({
  dx = 0,
  dy = 0,
  brakeIsActive = false,
  scrollIsActive = false,
  scrollDx = 0,
  scrollDy = 0,
  config = {},
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

/**
 * Toggles the state of the mouse button.
 *
 * @param {string} key - The key character to toggle (e.g., values set for 'mb1', 'mb2', 'mb3' in config; mb = mouse button).
 * @param {boolean} down - Indicates whether the button should be pressed down ("down") or released ("up").
 * @param {number} button - The button code. 0 for left button, 1 for right button, 2 for middle button.
 * @returns {undefined} - No return value.
 */
export const mouseToggle = (key, down, button) => {
  if (base.get(`prevKeyStates.${key}`) !== base.get(`keyStates.${key}`))
    robot.mouseToggle(down, button);
};
