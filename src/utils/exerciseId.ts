/** Strip the _timestamp_random suffix from a movement instance ID to get the base exercise ID. */
export function getBaseExerciseId(movementId: string): string {
  return movementId.replace(/_\d+_[a-z0-9]+$/, '');
}
