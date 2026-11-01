export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
}

export interface Customer {
  _id?: string;
  name: string;
  branch?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  sameAsBilling: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerFormData {
  name: string;
  branch?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  billingLine1: string;
  billingLine2?: string;
  billingCity: string;
  billingState: string;
  billingStateCode: string;
  billingPincode: string;
  sameAsBilling: boolean;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingStateCode?: string;
  shippingPincode?: string;
}
