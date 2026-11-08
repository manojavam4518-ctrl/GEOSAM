/**
 * Centralized Global Auto-Zoom Configuration for GEO TRANSIT Logistics Console
 *
 * Requirements:
 * - Auto-Zoom Preview activation delay is strictly 1000 milliseconds (exactly 1 second) across all modules:
 *   1. Proforma Invoice – Live A4 Preview
 *   2. Shipping Label Generator – Live Address Label Preview
 *   3. Declaration Templates – Goods Declaration Note Preview
 *   4. Personal Declaration Note Preview
 *   5. Batch Address Print Preview
 *   6. Barcode Generator Preview
 *
 * - When the cursor hovers continuously for 1000ms, the magnifier activates.
 * - When the cursor leaves before 1000ms, the timer is immediately cancelled.
 * - When re-entering, a fresh 1000ms timer starts.
 * - When the cursor moves outside the preview area, the magnifier closes after a smooth exit buffer.
 */

/**
 * Exactly 1000 milliseconds (1 second) continuous hover delay before Auto-Zoom magnifier activates
 */
export const AUTO_ZOOM_ACTIVATION_DELAY_MS = 1000;

/**
 * Buffer in milliseconds before closing the magnifier when pointer leaves the preview boundaries,
 * preventing flickering and allowing smooth pointer movement.
 */
export const AUTO_ZOOM_EXIT_DELAY_MS = 150;

