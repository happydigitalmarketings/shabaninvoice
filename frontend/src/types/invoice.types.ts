// Invoice types
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
}

export interface SellerInfo {
  businessName: string;
  address: Address;
  mobile: string;
  email: string;
  gstin: string;
  state: string;
  stateCode: string;
}

export interface InvoiceItem {
  _id?: string;
  srNo: number;
  productId?: string;
  productName: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export interface PaymentRecord {
  _id?: string;
  date: string;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  reference?: string;
  notes?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface PdfAttachment {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface Invoice {
  _id?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  seller: SellerInfo;
  customerId?: string;
  customer: {
    name: string;
    gstin?: string;
    phone?: string;
    email?: string;
    billingAddress: Address;
    shippingAddress?: Address;
    state: string;
    stateCode: string;
  };
  paymentTerms: string;
  reverseCharge: boolean;
  eWayBillNumber?: string;
  vehicleNumber?: string;
  placeOfSupply: string;
  isInterState: boolean;
  items: InvoiceItem[];
  subTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  amountInWords: string;
  paymentStatus: PaymentStatus;
  payments: PaymentRecord[];
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  pdfAttachment?: PdfAttachment;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceFormData {
  invoiceDate: string;
  dueDate?: string;
  customerId?: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingLine1: string;
  billingLine2?: string;
  billingCity: string;
  billingState: string;
  billingStateCode: string;
  billingPincode: string;
  sameAsBlling: boolean;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingStateCode?: string;
  shippingPincode?: string;
  paymentTerms: string;
  reverseCharge: boolean;
  eWayBillNumber?: string;
  vehicleNumber?: string;
  placeOfSupply: string;
  isInterState: boolean;
  notes?: string;
}
