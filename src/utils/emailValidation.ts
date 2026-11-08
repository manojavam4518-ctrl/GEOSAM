/**
 * Global Email Format Validation Utility for GEO TRANSIT
 * Strictly validates email formats across all platform modules.
 */

export interface EmailValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface EmailValidationOptions {
  required?: boolean;
  fieldName?: string;
}

/**
 * Validates an email address against standard international format specifications.
 *
 * Valid examples:
 * - manoj@gmail.com
 * - exporter@example.com
 * - accounts@company.in
 * - logistics.department@gmail.com
 *
 * Invalid examples:
 * - manoj@
 * - manoj@gmail
 * - manoj.com
 * - @gmail.com
 * - manoj@gmail.
 * - abc
 * - user name@gmail.com
 */
export function validateEmail(
  email: string | undefined | null,
  options: EmailValidationOptions = {}
): EmailValidationResult {
  const { required = false, fieldName = 'Email address' } = options;
  const trimmed = (email || '').trim();

  // 1. Empty Check
  if (!trimmed) {
    if (required) {
      return {
        isValid: false,
        errorMessage: `${fieldName} is required.`,
      };
    }
    // If optional and blank, it's valid
    return { isValid: true };
  }

  // 2. Spaces Check
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Email address cannot contain spaces.',
    };
  }

  // 3. Must contain '@'
  if (!trimmed.includes('@')) {
    return {
      isValid: false,
      errorMessage: "Please enter a valid email address (missing '@').",
    };
  }

  const parts = trimmed.split('@');
  if (parts.length > 2) {
    return {
      isValid: false,
      errorMessage: "Email address cannot contain multiple '@' symbols.",
    };
  }

  const [username, domain] = parts;

  // 4. Username Checks
  if (!username) {
    return {
      isValid: false,
      errorMessage: "Username before '@' is missing.",
    };
  }
  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return {
      isValid: false,
      errorMessage: 'Invalid username format in email address.',
    };
  }

  // 5. Domain Checks
  if (!domain) {
    return {
      isValid: false,
      errorMessage: 'Email domain is incomplete.',
    };
  }

  if (!domain.includes('.')) {
    return {
      isValid: false,
      errorMessage: 'Email domain is incomplete (e.g. missing .com, .in).',
    };
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email ID with a domain extension.',
    };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email ID with a domain extension (e.g. .com, .in).',
    };
  }

  for (const part of domainParts) {
    if (!part || part.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Email domain contains invalid consecutive dots.',
      };
    }
  }

  // 6. Standard RFC 5322 Compliant Regex
  const standardEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!standardEmailRegex.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address.',
    };
  }

  return { isValid: true };
}

/**
 * Shorthand boolean check for quick conditional checks
 */
export function isEmailValid(email: string | undefined | null, required = false): boolean {
  return validateEmail(email, { required }).isValid;
}
