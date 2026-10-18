/**
 * Modeled grams CO₂ for one run.
 * The cycle's energy is split evenly across the run's slots:
 * kWh per slot = energyKwh / slot count.
 * Grams = Σ (slot intensity in gCO₂/kWh × kWh per slot).
 */
export function modeledGrams(
  slotIntensitiesGco2PerKwh: readonly number[],
  energyKwh: number,
): number {
  const slotCount = slotIntensitiesGco2PerKwh.length;
  if (slotCount === 0) {
    throw new RangeError("A run needs at least one slot");
  }
  if (!Number.isFinite(energyKwh) || energyKwh < 0) {
    throw new RangeError(
      `energyKwh must be a non-negative finite number, received ${energyKwh}`,
    );
  }

  const kwhPerSlot = energyKwh / slotCount;
  let grams = 0;
  for (const intensity of slotIntensitiesGco2PerKwh) {
    if (!Number.isFinite(intensity) || intensity < 0) {
      throw new RangeError(
        `slot intensity must be a non-negative finite number, received ${intensity}`,
      );
    }
    grams += intensity * kwhPerSlot;
  }
  return grams;
}
