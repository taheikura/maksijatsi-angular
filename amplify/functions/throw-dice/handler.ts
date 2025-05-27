import type { Schema } from "../../data/resource"

export const handler: Schema["throwDice"]["functionHandler"] = async (event) => {
  // arguments typed from `.arguments()`
  const { numberOfDice } = event.arguments;

  const tableSize = 100;
  const dropHeight = 16;
  const maxVel = 13;

  const dice = []
  for (let index = 0; index < numberOfDice; index++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();

    const w = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
    const x = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
    const y = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
    const z = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);

    const position = {
      x: Math.random() * tableSize / 10 + tableSize / 3.5,
      y: Math.random() + dropHeight,
      z: Math.random() * tableSize / 10 + tableSize / 3.5,
    };
    const quaternion = {
      w: w,
      x: x,
      y: y,
      z: z,
    };
    const velocity = {
      x: -Math.random() * maxVel - 6,
      y: -Math.random() * maxVel / 2 - 5,
      z: -Math.random() * maxVel - 6,
    };
    const angularVelocity = {
      x: Math.random() * 50 - 25,
      y: Math.random() * 50 - 25,
      z: Math.random() * 50 - 25,
    };
    dice.push({
      position: position,
      quaternion: quaternion,
      velocity: velocity,
      angularVelocity: angularVelocity,
    });
  }

  // return typed from `.returns()`
  return {
    gravity: { x: 0, y: -24.0, z: 0 },
    groundPosition: { x: 0, y: -0.5, z: 0 },
    dice: dice,
  };
};
