import crypto from 'crypto';

export interface PersonalDeclarationItem {
  sNo: number;
  description: string;
  amount: string;
}

export interface PersonalDeclarationInput {
  templateType: 'PERSONAL_GOODS';
  declarationDate: string; // DD/MM/YYYY

  // Consignor's Name & Address
  consignorName: string;
  consignorAddressLine1: string;
  consignorAddressLine2: string;
  consignorPincode: string;
  consignorContact: string;

  // Consignee's Name & Address
  consigneeName: string;
  consigneeAddressLine1: string;
  consigneeAddressLine2: string;
  consigneePincode: string;
  consigneeContact: string;

  // Declaration Introduction Letter Fields
  customerName: string;
  residentialAddress: string;
  identificationNumber: string;
  destinationAddress: string;

  // 10-Row Items Table
  items: PersonalDeclarationItem[];

  // Declaration Section
  docketNumber: string;

  // Signature (optional digital drawing base64, or blank for physical signing)
  signatureBase64?: string;
}

export interface PersonalDeclarationRecord extends PersonalDeclarationInput {
  id: string;
  _id?: any;
  declarationNumber: string;
  organizationId: string;
  userId: string;
  createdByName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns formatted today's date in DD/MM/YYYY
 */
export const getFormattedTodayDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Generate 10 empty default rows for the items table
 */
export const createDefaultItems = (): PersonalDeclarationItem[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    sNo: i + 1,
    description: '',
    amount: '',
  }));
};

/**
 * Default initial state for Personal Goods Declaration Note
 */
export const initialPersonalDeclarationState: PersonalDeclarationInput = {
  templateType: 'PERSONAL_GOODS',
  declarationDate: getFormattedTodayDate(),
  consignorName: '',
  consignorAddressLine1: '',
  consignorAddressLine2: '',
  consignorPincode: '',
  consignorContact: '',
  consigneeName: '',
  consigneeAddressLine1: '',
  consigneeAddressLine2: '',
  consigneePincode: '',
  consigneeContact: '',
  customerName: '',
  residentialAddress: '',
  identificationNumber: '',
  destinationAddress: '',
  items: createDefaultItems(),
  docketNumber: '',
  signatureBase64: '',
};

