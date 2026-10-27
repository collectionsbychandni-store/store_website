import React, { useRef } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

/**
 * Collections by Chandni - POS Receipt Modal & Print Layout
 *
 * Implements Launch Step 27:
 * - High-fidelity print styles (@media print) hiding UI chrome
 * - Suitable for both standard thermal receipt rolls (80mm) and A4 sheets
 * - Verified bill metadata, line itemization, discount/tax breakdown, and cashier name
 * - Configurable atelier return/exchange policy footer
 * - Safe reprinting without creating duplicate sales
 */
export default function PosReceiptModal({
  isOpen,
  onClose,
  bill,
  storeConfig,
  onNewSale,
}) {
  const receiptRef = useRef(null);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const store = storeConfig || {
    storeName: 'Collections by Chandni',
    tagline: 'Luxury Indian Artisan Couture & Heirlooms',
    addressLine1: 'Atelier Chandni, Heritage District',
    addressLine2: 'Near City Palace, M.I. Road',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    phone: '+91 98765 43210',
    email: 'orders@collectionsbychandni.in',
    exchangePolicy:
      'Artisan pieces are eligible for 7-day in-store exchange in original unworn condition with tags attached. Custom couture, bridal lehengas, and altered pieces are non-returnable.',
  };

  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = billDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subtotal = Number(bill.subtotal || 0);
  const discountAmount = Number(bill.discountAmount || 0);
  const taxAmount = Number(bill.taxAmount || 0);
  const totalAmount = Number(bill.totalAmount || 0);
  const cashTendered = Number(bill.cashTendered || totalAmount);
  const changeDue = Number(bill.changeDue || 0);

  const customerName =
    bill.customerDetails?.name || bill.customer?.name || 'Walk-in Patron';
  const customerPhone =
    bill.customerDetails?.phone || bill.customer?.phone || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Container with Print Styles */}
      <div className="bg-white border border-stone-200 rounded-xs shadow-2xl max-w-md w-full my-8 overflow-hidden print:max-w-none print:w-full print:border-none print:shadow-none print:m-0">
        {/* Screen Header (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-[#781D42] text-amber-50 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="font-serif font-semibold text-sm">
              Sale Completed · Receipt Ready
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div
          ref={receiptRef}
          id="pos-printable-receipt"
          className="p-6 text-stone-900 font-mono text-xs bg-white space-y-4 print:p-0"
        >
          {/* Atelier Brand Header */}
          <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-4">
            <div className="font-serif text-lg font-bold text-[#781D42] tracking-wider uppercase">
              {store.storeName}
            </div>
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-sans">
              {store.tagline}
            </div>
            <div className="text-[10px] text-stone-600 pt-1 leading-tight">
              {store.addressLine1}, {store.addressLine2}
              <br />
              {store.city}, {store.state} - {store.pincode}
              <br />
              Tel: {store.phone} · {store.email}
            </div>
          </div>

          {/* Bill Meta Details */}
          <div className="grid grid-cols-2 gap-1 text-[11px] border-b border-dashed border-stone-300 pb-3">
            <div>
              <span className="text-stone-400">INVOICE: </span>
              <span className="font-bold">{bill.orderNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-stone-400">DATE: </span>
              <span>{formattedDate}</span>
            </div>
            <div>
              <span className="text-stone-400">CASHIER: </span>
              <span>{bill.posCashierName || 'Atelier Staff'}</span>
            </div>
            <div className="text-right">
              <span className="text-stone-400">TIME: </span>
              <span>{formattedTime}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-stone-100 flex justify-between">
              <span className="text-stone-400">PATRON: </span>
              <span className="font-semibold">
                {customerName}
                {customerPhone ? ` (${customerPhone})` : ''}
              </span>
            </div>
            <div className="col-span-2 flex justify-between text-[10px] text-stone-500">
              <span>CHANNEL: In-Store Counter</span>
              <span>STATUS: PAID & DELIVERED</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
            <div className="flex justify-between font-bold text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-1">
              <span className="w-6/12">Item Description</span>
              <span className="w-2/12 text-center">Qty</span>
              <span className="w-2/12 text-right">Rate</span>
              <span className="w-2/12 text-right">Amount</span>
            </div>

            {(bill.items || []).map((item, idx) => (
              <div key={item.id || idx} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-medium">
                  <span className="w-6/12 truncate" title={item.productTitle}>
                    {item.productTitle}
                  </span>
                  <span className="w-2/12 text-center">{item.quantity}</span>
                  <span className="w-2/12 text-right">
                    ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                  </span>
                  <span className="w-2/12 text-right font-semibold">
                    ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 font-sans pl-1">
                  Size: {item.size || 'OS'} · Color: {item.color || 'Artisan'} · SKU: {item.sku}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-[11px] border-b border-dashed border-stone-300 pb-3">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Atelier Discount:</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Applicable Tax (GST):</span>
                <span>+₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between font-bold font-serif text-sm text-stone-900 pt-1.5 border-t border-stone-200">
              <span>GRAND TOTAL:</span>
              <span>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>

            {/* Payment Details */}
            <div className="pt-2 border-t border-stone-100 flex justify-between text-stone-700">
              <span className="text-stone-400">PAYMENT METHOD:</span>
              <span className="font-semibold uppercase tracking-wider text-[#781D42]">
                {bill.paymentMethod || 'CASH'}
              </span>
            </div>

            {bill.paymentMethod === 'CASH' && (
              <>
                <div className="flex justify-between text-stone-500 text-[10px]">
                  <span>Cash Tendered:</span>
                  <span>₹{cashTendered.toLocaleString('en-IN')}</span>
                </div>
                {changeDue > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-800 text-[11px]">
                    <span>Change Returned:</span>
                    <span>₹{changeDue.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </>
            )}

            {bill.posNotes && (
              <div className="pt-1 text-[10px] text-stone-500 italic">
                Note: {bill.posNotes}
              </div>
            )}
          </div>

          {/* Return & Exchange Policy */}
          <div className="text-[9px] text-stone-500 text-center leading-relaxed font-sans pt-1">
            <p className="font-semibold uppercase tracking-wider text-stone-600 mb-0.5">
              Exchange Policy
            </p>
            <p>{store.exchangePolicy}</p>
          </div>

          {/* Footer Barcode Simulation & Thank You */}
          <div className="text-center pt-2 space-y-1">
            <div className="font-mono text-[9px] tracking-[0.3em] text-stone-400 uppercase">
              *{bill.orderNumber}*
            </div>
            <div className="font-serif italic text-[11px] text-[#781D42]">
              Thank you for choosing Collections by Chandni
            </div>
            <div className="text-[9px] text-stone-400">
              Visit our online atelier: collectionsbychandni.in
            </div>
          </div>
        </div>

        {/* Screen Action Footer (Hidden on Print) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-stone-300 text-stone-700 hover:bg-white rounded-xs font-medium"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="px-4 py-2 text-xs border border-[#781D42] text-[#781D42] hover:bg-rose-50 rounded-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>New Sale</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs bg-[#781D42] text-amber-50 hover:bg-[#5B1123] rounded-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={14} />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
