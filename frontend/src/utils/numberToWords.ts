/**
 * Convert a numeric amount to Indian English words.
 * e.g. 1344.50 → "Rupees One Thousand Three Hundred Forty Four and Paise Fifty Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function wordsLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
  }
  return (
    ones[Math.floor(n / 100)] +
    ' Hundred' +
    (n % 100 ? ' ' + wordsLessThanThousand(n % 100) : '')
  );
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';

  let result = '';

  if (n >= 10000000) {
    result += wordsLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
    n %= 10000000;
  }
  if (n >= 100000) {
    result += wordsLessThanThousand(Math.floor(n / 100000)) + ' Lakh ';
    n %= 100000;
  }
  if (n >= 1000) {
    result += wordsLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
    n %= 1000;
  }
  result += wordsLessThanThousand(n);

  return result.trim();
}

export function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);

  let words = numberToWords(rupees);
  if (paise > 0) {
    words += ' and ' + numberToWords(paise) + ' Paise';
  }
  return words + ' Only.';
}
