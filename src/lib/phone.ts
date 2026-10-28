const COUNTRY_CODE = '998';
const NATIONAL_LENGTH = 9;

export const PHONE_PREFIX = '+998 ';

/** Extracts up to 9 national digits (without the 998 country code). */
function nationalDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  const national = digits.startsWith(COUNTRY_CODE) ? digits.slice(COUNTRY_CODE.length) : digits;
  return national.slice(0, NATIONAL_LENGTH);
}

/** Formats raw input as "+998 90 123 45 67". */
export function formatPhone(input: string): string {
  const d = nationalDigits(input);
  const groups = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `${PHONE_PREFIX}${groups.join(' ')}`;
}

/** Returns "+998901234567" form used by the API. */
export function normalizePhone(input: string): string {
  return `+${COUNTRY_CODE}${nationalDigits(input)}`;
}

export function isCompletePhone(input: string): boolean {
  return nationalDigits(input).length === NATIONAL_LENGTH;
}
