/**
 * Utility functions for Indian Date Formatting across GEO TRANSIT.
 * Standard Date Format: DD/MM/YYYY (e.g. 31/08/2026)
 * Standard Date + Time Format: DD/MM/YYYY, HH:MM AM/PM (e.g. 31/08/2026, 10:30 PM)
 */

export function formatDateIndian(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return 'N/A';

  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return 'N/A';

  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  let day = '';
  let month = '';
  let year = '';

  for (const part of parts) {
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
  }

  if (!day || !month || !year) return 'N/A';
  return `${day}/${month}/${year}`;
}

export function formatDateTimeIndian(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return 'N/A';

  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return 'N/A';

  const datePart = formatDateIndian(date);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  let hour = '';
  let minute = '';
  let dayPeriod = '';

  for (const part of parts) {
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
    if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
  }

  if (!hour || !minute) return datePart;

  return `${datePart}, ${hour}:${minute} ${dayPeriod}`;
}
