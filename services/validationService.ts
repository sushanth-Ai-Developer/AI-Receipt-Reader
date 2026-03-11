
import { CodeValidationResult } from '../types';

export const validateUPC = (code: string): boolean => {
  const clean = code.replace(/\D/g, ''); 
  if (clean.length !== 12) return false;
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(clean[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[11]);
};

export const validateEAN = (code: string): boolean => {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[12]);
};

export const validateSSCC = (code: string): boolean => {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 18) return false;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(clean[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[17]);
};

export const validateCode = (value: string): CodeValidationResult => {
  if (!value) return { value: '', type: 'UNKNOWN', isValid: false };
  // Keep characters that are digits or common separators for initial clean but then strip for validation
  const clean = value.replace(/[^0-9]/g, '');

  if (clean.length === 12) {
    return { value: clean, type: 'UPC-A', isValid: validateUPC(clean) };
  }
  
  if (clean.length === 11) {
    const padded = '0' + clean;
    const isValid = validateUPC(padded);
    return { value: padded, type: 'UPC-A', isValid };
  }
  
  if (clean.length === 13) {
    return { value: clean, type: 'EAN-13', isValid: validateEAN(clean) };
  }
  
  if (clean.length === 18) {
    return { value: clean, type: 'SSCC-18', isValid: validateSSCC(clean) };
  }
  
  // Basic fallback for UCI/Serial patterns
  if (value.length >= 8 && value.length <= 25 && /^[A-Z0-9-]+$/i.test(value)) {
    return { value: value.toUpperCase(), type: 'UCI', isValid: true };
  }

  return { value: clean, type: 'UNKNOWN', isValid: false };
};
