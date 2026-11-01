export interface Product {
  _id?: string;
  name: string;
  hsnSac: string;
  unit: string;
  unitPrice: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  name: string;
  hsnSac: string;
  unit: string;
  unitPrice: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  description?: string;
}

export const UNIT_OPTIONS = ['BOX', 'KG', 'G', 'PCS', 'PKT', 'SET', 'LTR', 'ML', 'NOS'];
