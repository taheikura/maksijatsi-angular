import type { Schema } from '../../data/resource';

export const handler: Schema['throwDice']['functionHandler'] = async (event) => {
  // arguments typed from `.arguments()`
  const { numberOfDice } = event.arguments;

  const tableSize = 100;
  const dropHeight = 16;
  const maxVel = 13;

  const dice = [];
  for (let index = 0; index < numberOfDice; index++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();

    const w = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
    const x = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
    const y = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
    const z = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);

    const position = {
      x: -6 + Math.random() * 2,
      y: 4 + Math.random(),
      z: -3 + Math.random() * 2,
    };
    const quaternion = {
      w,
      x,
      y,
      z,
    };
    const velocity = {
      x: 4 + Math.random() * 2,
      y: 2 + Math.random(),
      z: 1 + Math.random(),
    };
    const angularVelocity = {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
    };
    dice.push({
      position,
      quaternion,
      velocity,
      angularVelocity,
    });
  }

  // return typed from `.returns()`
  return {
    gravity: { x: 0, y: -24.0, z: 0 },
    groundPosition: { x: 0, y: -0.5, z: 0 },
    dice,
  };
};
