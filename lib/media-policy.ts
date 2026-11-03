export const FREE_PHOTO_MAX_BYTES = 512 * 1024;
export const PHOTO_TARGET_BYTES = 450 * 1024;
export const FREE_PHOTO_BUDGET_BYTES = 200 * 1024 * 1024;
export function photoByteLimit(storage: string | undefined) {
  return storage === "d1" ? FREE_PHOTO_MAX_BYTES : 3 * 1024 * 1024;
}
