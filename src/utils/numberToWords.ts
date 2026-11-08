/**
 * Indian Rupee Number to Words Converter
 * Converts numeric amounts into formal words formatted for Indian financial and logistics documents.
 * Example: 12500 -> "Rupees Twelve Thousand Five Hundred Only"
 */

const ONES: string[] = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS: string[] = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertTwoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one > 0 ? ' ' + ONES[one] : ''}`.trim();
}

function convertThreeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';
  if (hundred > 0) {
    result += `${ONES[hundred]} Hundred`;
  }
  if (remainder > 0) {
    if (result) result += ' ';
    result += convertTwoDigits(remainder);
  }
  return result;
}

/**
 * Converts a positive number to Indian numbering words (Crores, Lakhs, Thousands, Hundreds)
 */
export function convertNumberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Only';
  }

  // Separate integer and decimal (paise)
  const absoluteAmount = Math.abs(amount);
  const rupees = Math.floor(absoluteAmount);
  const paise = Math.round((absoluteAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Only';
  }

  let words = '';

  if (rupees > 0) {
    let num = rupees;

    // Crores (1,00,00,000)
    const crores = Math.floor(num / 10000000);
    num %= 10000000;

    // Lakhs (1,00,000)
    const lakhs = Math.floor(num / 100000);
    num %= 100000;

    // Thousands (1,000)
    const thousands = Math.floor(num / 1000);
    num %= 1000;

    // Hundreds and remaining (< 1000)
    const remaining = num;

    const parts: string[] = [];

    if (crores > 0) {
      parts.push(`${convertNumberToIndianWords(crores).replace(' Only', '')} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${convertTwoDigits(thousands)} Thousand`);
    }
    if (remaining > 0) {
      parts.push(convertThreeDigits(remaining));
    }

    words = parts.join(' ').trim();
  }

  let result = words ? `${words}` : '';

  if (paise > 0) {
    const paiseWords = convertTwoDigits(paise);
    if (result) {
      result += ` and ${paiseWords} Paise`;
    } else {
      result = `${paiseWords} Paise`;
    }
  }

  return `${result.trim()} Only`;
}

/**
 * Formats a currency value with Indian numbering commas
 * e.g. 1250000 -> "12,50,000"
 */
export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount)) return '0';
  const parts = amount.toString().split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return parts.length > 1 ? `${res}.${parts[1]}` : res;
}

