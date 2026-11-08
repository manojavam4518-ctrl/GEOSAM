/**
 * Centralized Generalized Goods Category Master List
 * Used across Declaration Templates for the Content (Goods Description) selection dropdown.
 */

export const GENERALIZED_GOODS_CATEGORIES = [
  'Electronics & Electrical Goods',
  'Clothes & Apparels',
  'Household Goods',
  'Personal Belongings',
  'Industrial & Machinery Goods',
  'Automobile & Spare Parts',
  'Medical & Healthcare Products',
  'Books & Stationery',
  'Food & Agricultural Products',
  'Cosmetics & Beauty Products',
  'Sports & Fitness Goods',
  'Toys & Entertainment Items',
  'Gifts & Decorative Items',
  'Documents & Printed Materials',
  'Construction & Building Materials',
  'Chemical & Laboratory Materials',
  'Promotional & Marketing Materials',
  'Packaging Materials',
  'Furniture & Home Furnishing',
  'Computer & IT Equipment',
  'Mobile Phones & Accessories',
  'Musical Instruments',
  'Jewellery & Accessories',
  'Textile & Fabric Materials',
  'Samples & Product Demonstration Materials',
  'Returned & Replacement Goods',
  'Other / Miscellaneous Goods',
] as const;

export const OTHER_CUSTOM_DESCRIPTION_OPTION = 'Other / Custom Description';

export type GeneralizedGoodsCategory = (typeof GENERALIZED_GOODS_CATEGORIES)[number];

