import type { Schema } from '../../data/resource';

export const handler: Schema['throwDice']['functionHandler'] = async (event) => {
  const { numberOfDice } = event.arguments;

  // Base trajectory for consistent arcs
  const baseVelocity = { x: 3, y: 0, z: 2 };

  const dice = [];
  for (let index = 0; index < numberOfDice; index++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();

    const w = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
    const x = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
    const y = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
    const z = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);

    const spread = index * 0.3;
    const position = {
      x: -5 + spread,
      y: 4,
      z: Math.random() * 0.5,
    };
    const quaternion = { w, x, y, z };
    const velocity = {
      x: baseVelocity.x + (Math.random() - 0.5) * 0.2,
      y: baseVelocity.y + (Math.random() - 0.5) * 0.2,
      z: baseVelocity.z + (Math.random() - 0.5) * 0.2,
    };
    const angularVelocity = {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 4,
    };
    dice.push({ position, quaternion, velocity, angularVelocity });
  }

  return {
    gravity: { x: 0, y: -24.0, z: 0 },
    groundPosition: { x: 0, y: -0.5, z: 0 },
    dice,
  };
};