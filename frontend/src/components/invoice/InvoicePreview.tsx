import React from 'react';
import type { Invoice } from '../../types/invoice.types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { amountToWords } from '../../utils/numberToWords';
import '../../styles/invoice-print.css';

// Default business details matching Shaban Traditional Foods & manual invoice
const DEFAULT_SELLER = {
  businessName: 'SHABAN TRADITIONAL FOODS',
  addressLine1: '44,Sengottaiah Colony, Saradha Mill Road, Sundarapuram',
  addressLine2: 'Coimbatore, Tamil Nadu - 641024',
  mobile: '9585949146',
  email: 'shabantrendsofficial@gmail.com',
  gstin: '33BBFPA5813G1Z7',
  state: 'TamilNadu',
  stateCode: '33',
};

const DEFAULT_BANK = {
  accountName: 'Abeetha Banu',
  accountNumber: '1239101130564',
  ifsc: 'CNRB0001239',
  bankName: 'Canara Bank',
  branch: 'Sundarapuram',
  upiId: 'abeethabanun@oksbi',
};

const TERMS = [
  '1. Goods once sold will not be taken back.',
  '2. Payment is due as per agreed payment terms.',
  '3. Subject to Coimbatore jurisdiction.',
];

interface InvoicePreviewProps {
  invoice: Invoice;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
  const {
    invoiceNumber, invoiceDate, seller, customer,
    paymentTerms, reverseCharge, eWayBillNumber, vehicleNumber,
    items = [], subTotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, totalTax = 0,
    grandTotal = 0, balanceDue, isInterState,
    status, notes,
  } = invoice;

  let formattedDate = '—';
  if (invoiceDate) {
    try {
      formattedDate = format(new Date(invoiceDate), 'dd-MM-yyyy');
    } catch {
      formattedDate = invoiceDate;
    }
  }

  // Seller details with complete fallbacks
  const sellerName = seller?.businessName || DEFAULT_SELLER.businessName;
  const sellerLine1 = (seller?.address?.line1)
    ? `${seller.address.line1}${seller.address.line2 ? `, ${seller.address.line2}` : ''}`
    : DEFAULT_SELLER.addressLine1;
  const sellerLine2 = (seller?.address?.city || seller?.address?.state || seller?.address?.pincode)
    ? `${seller.address.city || 'Coimbatore'}, ${seller.address.state || 'Tamil Nadu'} - ${seller.address.pincode || '641024'}`
    : DEFAULT_SELLER.addressLine2;
  const sellerMobile = seller?.mobile || DEFAULT_SELLER.mobile;
  const sellerEmail  = seller?.email  || DEFAULT_SELLER.email;
  const sellerGstin  = seller?.gstin  || DEFAULT_SELLER.gstin;
  const sellerState  = seller?.state  || DEFAULT_SELLER.state;
  const sellerStateCode = seller?.stateCode || DEFAULT_SELLER.stateCode;

  // Receiver / Consignee details
  const billingAddr = customer?.billingAddress;
  const billingAddrString = [
    billingAddr?.line1,
    billingAddr?.line2,
    billingAddr?.city,
    billingAddr?.pincode ? `${billingAddr?.state || ''} - ${billingAddr?.pincode}` : (billingAddr?.state || '')
  ].filter(Boolean).join(', ') || '—';

  const shippingAddr = customer?.shippingAddress || billingAddr;
  const shippingAddrString = [
    shippingAddr?.line1,
    shippingAddr?.line2,
    shippingAddr?.city,
    shippingAddr?.pincode ? `${shippingAddr?.state || ''} - ${shippingAddr?.pincode}` : (shippingAddr?.state || '')
  ].filter(Boolean).join(', ') || billingAddrString;

  // Extract reference number if present
  const referenceNo = (notes?.toLowerCase().startsWith('ref:') || notes?.toLowerCase().startsWith('reference:'))
    ? notes.split(':')[1]?.trim()
    : '';

  // Sum of quantities
  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  // Exact words
  const wordsDisplay = amountToWords(grandTotal);

  // Current balance due or grand total for UPI QR
  const upiDue = balanceDue !== undefined ? balanceDue : grandTotal;
  const upiPaymentUrl = `upi://pay?pa=${DEFAULT_BANK.upiId}&pn=${encodeURIComponent(sellerName)}&am=${upiDue.toFixed(2)}&cu=INR`;

  return (
    <div className="invoice-print-area" id="invoice-preview">
      {status === 'cancelled' && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '4px 8px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '6px',
          fontSize: '9pt',
        }}>
          ⚠ CANCELLED INVOICE
        </div>
      )}

      {/* ── Main Outer Border Box ── */}
      <div className="arafa-invoice-box">

        {/* 1. Top Header Row */}
        <div className="arafa-header-row">
          {/* Left Brand block */}
          <div className="arafa-brand-col">
            <div className="arafa-brand-title">SHABAN</div>
            <div className="arafa-brand-sub">TRADITIONAL FOODS</div>
          </div>

          {/* Center Seller details */}
          <div className="arafa-seller-col">
            <div className="arafa-seller-name">{sellerName}</div>
            <div>{sellerLine1}</div>
            <div>{sellerLine2}</div>
            <div>Mobile: {sellerMobile} E-mail: {sellerEmail}</div>
            <div>
              <strong>GSTIN:</strong> {sellerGstin} &nbsp;&nbsp; <strong>State:</strong> {sellerState}
            </div>
          </div>

          {/* Right TAX INVOICE title */}
          <div className="arafa-tax-col">
            <div className="arafa-tax-title">TAX INVOICE</div>
          </div>
        </div>

        {/* 2. Meta Grid (2 rows x 4 cols) */}
        <div className="arafa-meta-grid">
          <div className="arafa-meta-cell">
            <span className="arafa-label">Invoice Number: </span>
            <span className="arafa-val font-bold">{invoiceNumber}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">Invoice Date:</span><br />
            <span className="arafa-val">{formattedDate}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">Reverse Charge: </span>
            <span className="arafa-val">{reverseCharge ? 'Yes' : 'No'}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">Payment Terms: </span>
            <span className="arafa-val">{paymentTerms || 'Credit'}</span>
          </div>

          <div className="arafa-meta-cell">
            <span className="arafa-label">State / State Code:</span><br />
            <span className="arafa-val">{sellerState} / {sellerStateCode}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">E-Way Bill No.: </span>
            <span className="arafa-val">{eWayBillNumber || ''}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">Delivery / Vehicle No.: </span>
            <span className="arafa-val">{vehicleNumber || ''}</span>
          </div>
          <div className="arafa-meta-cell">
            <span className="arafa-label">Reference No.: </span>
            <span className="arafa-val">{referenceNo}</span>
          </div>
        </div>

        {/* 3. Details of Receiver / Billed To & Consignee / Shipped To */}
        <div className="arafa-party-grid">
          <div className="arafa-party-col">
            <div className="arafa-party-heading">Details of Receiver / Billed To</div>
            <div><strong>Name:</strong> {customer?.name}</div>
            <div><strong>Address:</strong> {billingAddrString}</div>
            <div><strong>GSTIN:</strong> {customer?.gstin || ''}</div>
            <div><strong>State Code:</strong> {customer?.stateCode || sellerStateCode}</div>
            <div><strong>State:</strong> {customer?.state || sellerState}</div>
          </div>

          <div className="arafa-party-col">
            <div className="arafa-party-heading">Details of Consignee / Shipped To</div>
            <div><strong>Name:</strong> {customer?.name}</div>
            <div><strong>Address:</strong> {shippingAddrString}</div>
            <div><strong>GSTIN:</strong> {customer?.gstin || ''}</div>
            <div><strong>State Code:</strong> {shippingAddr?.stateCode || customer?.stateCode || sellerStateCode}</div>
            <div><strong>State:</strong> {shippingAddr?.state || customer?.state || sellerState}</div>
          </div>
        </div>

        {/* 4. Products Table (CSS Grid format for 100% pixel-perfect rendering) */}
        <div className="arafa-grid-table">
          {/* Header Row */}
          <div className={`arafa-grid-row ${!isInterState ? 'arafa-row-intra' : 'arafa-row-inter'}`}>
            <div className="arafa-grid-cell arafa-grid-header">Sl.<br />No.</div>
            <div className="arafa-grid-cell arafa-grid-header text-left">Name of Product</div>
            <div className="arafa-grid-cell arafa-grid-header">HSN/SAC</div>
            <div className="arafa-grid-cell arafa-grid-header">Qty</div>
            <div className="arafa-grid-cell arafa-grid-header">Unit</div>
            <div className="arafa-grid-cell arafa-grid-header">Rate</div>
            <div className="arafa-grid-cell arafa-grid-header">Taxable<br />Value</div>
            {!isInterState ? (
              <>
                <div className="arafa-grid-cell arafa-grid-header">CGST<br />Rate</div>
                <div className="arafa-grid-cell arafa-grid-header">CGST<br />Amount</div>
                <div className="arafa-grid-cell arafa-grid-header">SGST<br />Rate</div>
                <div className="arafa-grid-cell arafa-grid-header">SGST<br />Amount</div>
              </>
            ) : (
              <>
                <div className="arafa-grid-cell arafa-grid-header">IGST<br />Rate</div>
                <div className="arafa-grid-cell arafa-grid-header">IGST<br />Amount</div>
              </>
            )}
            <div className="arafa-grid-cell arafa-grid-header">Total</div>
          </div>

          {/* Item Rows */}
          {items.map((item, i) => (
            <div
              className={`arafa-grid-row ${!isInterState ? 'arafa-row-intra' : 'arafa-row-inter'}`}
              key={item._id || i}
            >
              <div className="arafa-grid-cell text-center">{item.srNo ?? i + 1}</div>
              <div className="arafa-grid-cell text-left">{item.productName}</div>
              <div className="arafa-grid-cell text-center">{item.hsnSac}</div>
              <div className="arafa-grid-cell text-center">{item.quantity}</div>
              <div className="arafa-grid-cell text-center">{item.unit || 'PCS'}</div>
              <div className="arafa-grid-cell text-right">{(Number(item.unitRate) || 0).toFixed(2)}</div>
              <div className="arafa-grid-cell text-right">{(Number(item.taxableAmount) || 0).toFixed(2)}</div>
              {!isInterState ? (
                <>
                  <div className="arafa-grid-cell text-center">{(Number(item.cgstRate) || 0).toFixed(2)}%</div>
                  <div className="arafa-grid-cell text-right">{(Number(item.cgstAmount) || 0).toFixed(2)}</div>
                  <div className="arafa-grid-cell text-center">{(Number(item.sgstRate) || 0).toFixed(2)}%</div>
                  <div className="arafa-grid-cell text-right">{(Number(item.sgstAmount) || 0).toFixed(2)}</div>
                </>
              ) : (
                <>
                  <div className="arafa-grid-cell text-center">{(Number(item.igstRate) || 0).toFixed(2)}%</div>
                  <div className="arafa-grid-cell text-right">{(Number(item.igstAmount) || 0).toFixed(2)}</div>
                </>
              )}
              <div className="arafa-grid-cell text-right">{(Number(item.totalAmount) || 0).toFixed(2)}</div>
            </div>
          ))}

          {/* TOTAL Row */}
          <div className={`arafa-grid-row ${!isInterState ? 'arafa-row-intra' : 'arafa-row-inter'}`}>
            <div className="arafa-grid-cell arafa-col-span-3 text-right font-bold">TOTAL</div>
            <div className="arafa-grid-cell text-center font-bold">{totalQty}</div>
            <div className="arafa-grid-cell"></div>
            <div className="arafa-grid-cell"></div>
            <div className="arafa-grid-cell text-right font-bold">₹{subTotal.toFixed(2)}</div>
            {!isInterState ? (
              <>
                <div className="arafa-grid-cell"></div>
                <div className="arafa-grid-cell text-right font-bold">₹{totalCgst.toFixed(2)}</div>
                <div className="arafa-grid-cell"></div>
                <div className="arafa-grid-cell text-right font-bold">₹{totalSgst.toFixed(2)}</div>
              </>
            ) : (
              <>
                <div className="arafa-grid-cell"></div>
                <div className="arafa-grid-cell text-right font-bold">₹{totalIgst.toFixed(2)}</div>
              </>
            )}
            <div className="arafa-grid-cell text-right font-bold">₹{grandTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* 5. Bottom Split Summary Area */}
        <div className="arafa-bottom-grid">
          {/* Left Column */}
          <div className="arafa-bottom-left">
            {/* Amount in words */}
            <div className="arafa-words-section">
              <div className="arafa-section-header">Total Invoice Amount in Words</div>
              <div className="arafa-words-text">{wordsDisplay}</div>
            </div>

            {/* Bank details + UPI QR code */}
            <div className="arafa-bank-section">
              <div className="arafa-bank-info">
                <div className="arafa-section-header">Bank and Payment Details</div>
                <div><strong>UPI ID:</strong> {DEFAULT_BANK.upiId}</div>
                <div><strong>Account Name:</strong> {DEFAULT_BANK.accountName}</div>
                <div><strong>Account No.:</strong> {DEFAULT_BANK.accountNumber}</div>
                <div><strong>IFSC Code:</strong> {DEFAULT_BANK.ifsc}</div>
                <div><strong>Bank Name:</strong> {DEFAULT_BANK.bankName}</div>
                <div><strong>Branch Name:</strong> {DEFAULT_BANK.branch}</div>
              </div>
              <div className="arafa-qr-box">
                <QRCodeSVG value={upiPaymentUrl} size={90} level="M" />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="arafa-terms-section">
              <div className="arafa-section-header">Terms and Conditions</div>
              <div style={{ fontSize: '8pt', lineHeight: 1.5 }}>
                {TERMS.map((term, idx) => (
                  <div key={idx}>{term}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="arafa-bottom-right">
            {/* Financial breakdown */}
            <div className="arafa-totals-section">
              <div className="arafa-totals-row">
                <span>Total Amount Before Tax</span>
                <span className="font-bold">₹{subTotal.toFixed(2)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="arafa-totals-row" style={{ marginTop: '4px' }}>
                    <span>Add: CGST</span>
                    <span className="font-bold">₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="arafa-totals-row">
                    <span>Add: SGST</span>
                    <span className="font-bold">₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="arafa-totals-row" style={{ marginTop: '4px' }}>
                  <span>Add: IGST</span>
                  <span className="font-bold">₹{totalIgst.toFixed(2)}</span>
                </div>
              )}
              <div className="arafa-totals-divider">------------------</div>
              <div className="arafa-totals-row">
                <span>Total Tax Amount</span>
                <span className="font-bold">₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="arafa-totals-row font-bold">
                <span>Final Invoice Amount</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="arafa-totals-row font-bold">
                <span>Balance Due</span>
                <span>₹{(balanceDue !== undefined ? balanceDue : grandTotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Signature & Disclaimer */}
            <div className="arafa-sign-section">
              <div>
                Certified that the particulars given above<br />
                are true and correct.
              </div>
              <div className="arafa-sign-company">For, {sellerName}</div>
              <div className="arafa-sign-space"></div>
              <div className="arafa-sign-disclaimer">Computer Generated Invoice – Signature Not Required</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Centered Thank You Message */}
      <div className="arafa-thank-you">
        Thank you for your business
      </div>
    </div>
  );
};

export default InvoicePreview;
