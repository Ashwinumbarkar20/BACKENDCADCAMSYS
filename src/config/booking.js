/**
 * Booking scheduling constants.
 *
 * The *live* values for meeting length and the gap between meetings are set by
 * the owner under Settings → Booking and read through
 * `services/bookingSettings.js`. Everything here is only the fallback used
 * before that document exists (or if the read fails) plus the choices the admin
 * panel offers, kept in one place so the API and the UI can't drift apart.
 */

/** Meeting length, in minutes, when Settings has nothing saved yet. */
export const DEFAULT_DURATION_MINUTES = 30;

/** Gap enforced between two meetings, in minutes, when nothing is saved yet. */
export const DEFAULT_BUFFER_MINUTES = 10;

/** Hard bounds — anything saved outside these is clamped, never trusted raw. */
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 240;
export const MIN_BUFFER_MINUTES = 0;
export const MAX_BUFFER_MINUTES = 120;

/** Options shown in the admin dropdowns. */
export const DURATION_CHOICES = [15, 20, 30, 40, 45, 60, 90];
export const BUFFER_CHOICES = [0, 5, 10, 15, 20, 30];
