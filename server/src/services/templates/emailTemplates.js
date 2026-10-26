import {
  STORE_NAME,
  STORE_TAGLINE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  FRONTEND_URL,
} from '../../config/notificationConfig.js';

/**
 * Collections by Chandni - Luxury Atelier Email Templates
 *
 * Implements Launch Step 26:
 * - Branded HTML + Plain Text templates
 * - Strict segregation of COD vs PayU online payment status
 * - Line item variant attributes (size, color, sku)
 * - Safe delivery address summaries
 * - Direct authenticated tracking links
 */

// Shared Atelier Email Header and Footer styling
function baseLayout({ previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${STORE_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FBF9F7; font-family: 'Georgia', 'Times New Roman', serif; color: #1C1917; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; font-size: 1px; color: #FBF9F7; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FBF9F7; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #E7E5E4; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          
          <!-- Atelier Brand Header -->
          <tr>
            <td align="center" style="background-color: #781D42; padding: 28px 24px; text-align: center; border-bottom: 2px solid #5B1123;">
              <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 24px; letter-spacing: 2px; color: #FFF8E7; text-transform: uppercase; font-weight: normal;">
                ${STORE_NAME}
              </h1>
              <p style="margin: 6px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; letter-spacing: 3px; color: #E7C9D6; text-transform: uppercase;">
                ${STORE_TAGLINE}
              </p>
            </td>
          </tr>

          <!-- Dynamic Body Content -->
          <tr>
            <td style="padding: 32px 28px; font-family: 'Helvetica Neue', Arial, sans-serif;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Atelier Footer -->
          <tr>
            <td style="background-color: #F7F5F2; padding: 24px 28px; border-top: 1px solid #E7E5E4; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716C; font-weight: 500;">
                Need assistance with your heirloom parcel?
              </p>
              <p style="margin: 0 0 16px; font-size: 11px; color: #A8A29E;">
                Contact Atelier Care: <a href="mailto:${SUPPORT_EMAIL}" style="color: #781D42; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a> &bull; Phone: <span style="color: #44403C; font-weight: 600;">${SUPPORT_PHONE}</span>
              </p>
              <p style="margin: 0; font-size: 10px; color: #D6D3D1; text-transform: uppercase; letter-spacing: 1px;">
                &copy; ${new Date().getFullYear()} ${STORE_NAME}. Handcrafted with precision in India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. ORDER CONFIRMATION TEMPLATE
// ---------------------------------------------------------------------------
export function renderOrderConfirmedEmail({ order, customer, storeUrl = FRONTEND_URL }) {
  const isCod = order.paymentMethod === 'COD';
  const orderNumber = order.orderNumber || order.id;
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const customerName = customer?.name || order.shippingAddress?.name || 'Valued Patron';
  const orderDetailsUrl = `${storeUrl}/account/orders/${encodeURIComponent(order.id || orderNumber)}`;

  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #F5F5F4;">
        <p style="margin: 0 0 4px; font-weight: 600; color: #1C1917; font-size: 13px;">${item.productTitle}</p>
        <p style="margin: 0; color: #78716C; font-size: 11px;">
          ${item.size ? `Size: ${item.size} &bull; ` : ''}${item.color ? `Color: ${item.color} &bull; ` : ''}Qty: ${item.quantity}
        </p>
      </td>
      <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F5F5F4; font-weight: 600; color: #1C1917; font-size: 13px; vertical-align: top;">
        ₹${Number(item.totalPrice || item.unitPrice * item.quantity).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const paymentStatusBadge = isCod
    ? `<span style="background-color: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 2px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cash on Delivery (Payment Due Upon Delivery)</span>`
    : `<span style="background-color: #EEF2FF; color: #3730A3; padding: 4px 10px; border-radius: 2px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Online Payment (PayU Verified)</span>`;

  const contentHtml = `
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #1C1917;">
      Namaste, ${customerName}
    </h2>
    <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #57534E;">
      ${isCod
        ? 'Thank you for placing your bespoke heirloom order with Collections by Chandni. Your order has been confirmed with Cash on Delivery and is now being packaged with utmost care by our artisans.'
        : 'Thank you for your order with Collections by Chandni. Your order has been placed and is currently in our artisan fulfillment queue.'
      }
    </p>

    <!-- Key Order Badges -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF9F6; border: 1px solid #E7E5E4; border-radius: 4px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 8px;">Order Number:</td>
        <td align="right" style="font-size: 13px; font-weight: 700; color: #1C1917; font-family: monospace; padding: 4px 8px;">${orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 8px;">Order Date:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #1C1917; padding: 4px 8px;">${orderDate}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 8px;">Payment Method:</td>
        <td align="right" style="padding: 4px 8px;">${paymentStatusBadge}</td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <h3 style="font-family: 'Georgia', serif; font-size: 14px; font-weight: 600; margin: 0 0 10px; color: #1C1917; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #E7E5E4; padding-bottom: 6px;">
      Consignment Details
    </h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
      ${itemsHtml}
    </table>

    <!-- Pricing Summary -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #E7E5E4; padding-top: 12px; margin-bottom: 24px;">
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 0;">Subtotal:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #1C1917;">₹${Number(order.subtotal || order.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 0;">Luxury Delivery:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #10B981;">
          ${Number(order.shippingAmount || 0) === 0 ? 'Complimentary' : `₹${Number(order.shippingAmount).toLocaleString('en-IN')}`}
        </td>
      </tr>
      ${Number(order.discountAmount || 0) > 0 ? `
      <tr>
        <td style="font-size: 12px; color: #78716C; padding: 4px 0;">Privilege Discount:</td>
        <td align="right" style="font-size: 12px; font-weight: 600; color: #EF4444;">-₹${Number(order.discountAmount).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="font-size: 14px; font-weight: 700; color: #1C1917; padding: 8px 0; border-top: 1px solid #F5F5F4;">Total Payable:</td>
        <td align="right" style="font-size: 16px; font-weight: 700; color: #781D42; padding: 8px 0; border-top: 1px solid #F5F5F4;">₹${Number(order.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <!-- Delivery Address Snapshot -->
    ${order.shippingAddress ? `
    <div style="background-color: #FAF9F6; border: 1px solid #E7E5E4; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
      <h4 style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716C;">
        Bespoke Delivery Destination
      </h4>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #44403C;">
        <strong>${order.shippingAddress.name}</strong><br>
        ${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} &ndash; ${order.shippingAddress.pincode}<br>
        Contact: ${order.shippingAddress.phone || customer?.phone || 'On file'}
      </p>
    </div>
    ` : ''}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0 10px;">
      <a href="${orderDetailsUrl}" style="background-color: #781D42; color: #FFF8E7; padding: 12px 28px; text-decoration: none; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; display: inline-block;">
        View Order & Live Milestone Status &rarr;
      </a>
    </div>
  `;

  const subject = isCod
    ? `Order Confirmed: ${orderNumber} (Cash on Delivery) - Collections by Chandni`
    : `Order Placed: ${orderNumber} - Collections by Chandni`;

  const text = `Namaste ${customerName},

Thank you for your order with Collections by Chandni.
Order Number: ${orderNumber}
Order Date: ${orderDate}
Payment Method: ${isCod ? 'Cash on Delivery (₹' + Number(order.totalAmount).toLocaleString('en-IN') + ' to be collected upon delivery)' : 'Online Payment (PayU)'}
Total Amount: ₹${Number(order.totalAmount).toLocaleString('en-IN')}

Items:
${(order.items || []).map(i => `- ${i.productTitle} (${i.size || ''}/${i.color || ''}) x${i.quantity}: ₹${Number(i.totalPrice || i.unitPrice * i.quantity).toLocaleString('en-IN')}`).join('\n')}

View your order: ${orderDetailsUrl}

Support: ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}
Collections by Chandni`;

  return {
    subject,
    html: baseLayout({ previewText: `Your order ${orderNumber} has been received by Collections by Chandni.`, contentHtml }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. PAYMENT CONFIRMED TEMPLATE (PayU Online Payment Verified)
// ---------------------------------------------------------------------------
export function renderPaymentConfirmedEmail({ order, customer, paymentDetails = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Valued Patron';
  const orderDetailsUrl = `${storeUrl}/account/orders/${encodeURIComponent(order.id || orderNumber)}`;
  const txnId = paymentDetails.txnid || order.lastTxnId || 'Verified Transaction';
  const amountPaid = Number(paymentDetails.amount || order.totalAmount).toLocaleString('en-IN');
  const paymentMode = paymentDetails.mode || 'Online / UPI';

  const contentHtml = `
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #1C1917;">
      Payment Received With Thanks
    </h2>
    <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #57534E;">
      Dear ${customerName}, we have received and verified your payment of <strong>₹${amountPaid}</strong> via PayU Hosted Gateway for order <strong>${orderNumber}</strong>. Your consignment is now cleared for bespoke artisan packing.
    </p>

    <!-- Payment Receipt Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Order Reference:</td>
        <td align="right" style="font-size: 13px; font-weight: 700; color: #14532D; font-family: monospace; padding: 4px 8px;">${orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Payment Status:</td>
        <td align="right" style="font-size: 12px; font-weight: 700; color: #15803D; padding: 4px 8px;">VERIFIED &amp; PAID</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Transaction ID:</td>
        <td align="right" style="font-size: 12px; font-weight: 600; color: #14532D; font-family: monospace; padding: 4px 8px;">${txnId}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Payment Mode:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #14532D; padding: 4px 8px;">${paymentMode}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; font-weight: 700; color: #14532D; padding: 8px 8px 4px; border-top: 1px solid #DCFCE7;">Amount Credited:</td>
        <td align="right" style="font-size: 15px; font-weight: 700; color: #15803D; padding: 8px 8px 4px; border-top: 1px solid #DCFCE7;">₹${amountPaid}</td>
      </tr>
    </table>

    <p style="margin: 0 0 24px; font-size: 12px; color: #78716C; line-height: 1.5;">
      A tax invoice and certificate of authenticity will accompany your handloom packaging. You will receive an immediate courier dispatch alert with your live AWB tracking number once your parcel is handed over.
    </p>

    <div style="text-align: center; margin: 24px 0 10px;">
      <a href="${orderDetailsUrl}" style="background-color: #781D42; color: #FFF8E7; padding: 12px 28px; text-decoration: none; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; display: inline-block;">
        Track Order Status &rarr;
      </a>
    </div>
  `;

  const subject = `Payment Verified: ₹${amountPaid} for Order ${orderNumber} - Collections by Chandni`;
  const text = `Dear ${customerName},

Your payment of ₹${amountPaid} for Order ${orderNumber} has been verified successfully.
Transaction ID: ${txnId}
Payment Method: PayU (${paymentMode})
Order Status: CONFIRMED & IN ARTISAN QUEUE

View your order: ${orderDetailsUrl}

Support: ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}
Collections by Chandni`;

  return {
    subject,
    html: baseLayout({ previewText: `Payment verified for Collections by Chandni order ${orderNumber}.`, contentHtml }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. ORDER DISPATCHED TEMPLATE (Shiprocket AWB Assigned & Pickup)
// ---------------------------------------------------------------------------
export function renderOrderDispatchedEmail({ order, customer, shipment = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Valued Patron';
  const courierName = shipment.courierName || 'Shiprocket Insured Express';
  const awbCode = shipment.awbCode || 'Pending Allocation';
  const trackingUrl = shipment.trackingUrl || `https://shiprocket.co//tracking/${encodeURIComponent(awbCode)}`;
  const orderDetailsUrl = `${storeUrl}/account/orders/${encodeURIComponent(order.id || orderNumber)}`;

  const contentHtml = `
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #1C1917;">
      Your Heirloom Parcel Has Dispatched
    </h2>
    <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #57534E;">
      Dear ${customerName}, your consignment for order <strong>${orderNumber}</strong> has been packaged in our signature protective box and dispatched via <strong>${courierName}</strong>.
    </p>

    <!-- Courier Tracking Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 4px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="font-size: 12px; color: #6B21A8; padding: 4px 8px;">Courier Partner:</td>
        <td align="right" style="font-size: 13px; font-weight: 700; color: #581C87; padding: 4px 8px;">${courierName}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #6B21A8; padding: 4px 8px;">AWB Tracking Number:</td>
        <td align="right" style="font-size: 13px; font-weight: 700; color: #581C87; font-family: monospace; padding: 4px 8px;">${awbCode}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #6B21A8; padding: 4px 8px;">Expected Transit:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #581C87; padding: 4px 8px;">3&ndash;5 Business Days</td>
      </tr>
    </table>

    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="${trackingUrl}" style="background-color: #781D42; color: #FFF8E7; padding: 12px 28px; text-decoration: none; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; display: inline-block; margin-right: 8px;">
        Track Live Consignment &rarr;
      </a>
      <a href="${orderDetailsUrl}" style="background-color: #FFFFFF; color: #44403C; border: 1px solid #D6D3D1; padding: 11px 22px; text-decoration: none; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px; display: inline-block; margin-top: 8px;">
        View Order Details
      </a>
    </div>
  `;

  const subject = `Dispatched: Order ${orderNumber} via ${courierName} (AWB: ${awbCode}) - Collections by Chandni`;
  const text = `Dear ${customerName},

Your order ${orderNumber} has been dispatched!
Courier: ${courierName}
AWB Tracking Code: ${awbCode}
Track consignment: ${trackingUrl}

Order details: ${orderDetailsUrl}

Support: ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}
Collections by Chandni`;

  return {
    subject,
    html: baseLayout({ previewText: `Your Collections by Chandni parcel ${orderNumber} has dispatched with AWB ${awbCode}.`, contentHtml }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 4. ORDER CANCELLED TEMPLATE
// ---------------------------------------------------------------------------
export function renderOrderCancelledEmail({ order, customer, reason = '', storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Valued Patron';
  const isPrepaid = order.paymentStatus === 'PAID';

  const contentHtml = `
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #1C1917;">
      Order Cancellation Confirmation
    </h2>
    <p style="margin: 0 0 18px; font-size: 13px; line-height: 1.6; color: #57534E;">
      Dear ${customerName}, as requested, your order <strong>${orderNumber}</strong> has been cancelled.
    </p>

    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #991B1B; font-weight: 700;">
        Cancellation Reason
      </p>
      <p style="margin: 0; font-size: 12px; color: #7F1D1D;">
        ${reason || 'Cancelled per customer request'}
      </p>
    </div>

    ${isPrepaid ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
      <h4 style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #475569;">
        Refund Protocol
      </h4>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #334155;">
        Since this order was prepaid via PayU (₹${Number(order.totalAmount).toLocaleString('en-IN')}), a complete reversal has been queued. Funds typically reflect in your original payment account within 5&ndash;7 banking days.
      </p>
    </div>
    ` : `
    <p style="font-size: 12px; color: #78716C; margin-bottom: 20px;">
      Since this order was placed under Cash on Delivery, no funds were debited and no payout is required.
    </p>
    `}

    <p style="font-size: 12px; color: #78716C; margin: 0;">
      We hope to welcome you back to our atelier soon. If you have any inquiries, our artisan care team remains at your disposal.
    </p>
  `;

  const subject = `Order Cancelled: ${orderNumber} - Collections by Chandni`;
  const text = `Dear ${customerName},

Your order ${orderNumber} has been cancelled.
Reason: ${reason || 'Customer request'}
${isPrepaid ? `Prepaid refund of ₹${Number(order.totalAmount).toLocaleString('en-IN')} has been initiated and will reflect in 5-7 business days.` : 'No payment was collected (Cash on Delivery).'}

Support: ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}
Collections by Chandni`;

  return {
    subject,
    html: baseLayout({ previewText: `Confirmation of cancellation for order ${orderNumber}.`, contentHtml }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 5. REFUND PROCESSED TEMPLATE
// ---------------------------------------------------------------------------
export function renderRefundProcessedEmail({ order, customer, refund = {}, storeUrl = FRONTEND_URL }) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = customer?.name || order.shippingAddress?.name || 'Valued Patron';
  const refundAmount = Number(refund.amount || order.totalAmount).toLocaleString('en-IN');
  const bankRef = refund.bankRefNum || refund.payuRefundId || 'Processed via Banking Rail';
  const paymentMethod = refund.paymentMethod || order.paymentMethod || 'PayU';

  const contentHtml = `
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #1C1917;">
      Refund Successfully Processed
    </h2>
    <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #57534E;">
      Dear ${customerName}, we have successfully processed your refund of <strong>₹${refundAmount}</strong> for order <strong>${orderNumber}</strong>.
    </p>

    <!-- Refund Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Refunded Amount:</td>
        <td align="right" style="font-size: 15px; font-weight: 700; color: #15803D; padding: 4px 8px;">₹${refundAmount}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Payout Channel:</td>
        <td align="right" style="font-size: 12px; font-weight: 600; color: #14532D; padding: 4px 8px;">${paymentMethod} Reversal</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Bank Reference / ARN:</td>
        <td align="right" style="font-size: 12px; font-weight: 600; color: #14532D; font-family: monospace; padding: 4px 8px;">${bankRef}</td>
      </tr>
      <tr>
        <td style="font-size: 12px; color: #166534; padding: 4px 8px;">Clearing Estimate:</td>
        <td align="right" style="font-size: 12px; font-weight: 500; color: #14532D; padding: 4px 8px;">3&ndash;5 Business Days</td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #78716C; line-height: 1.5; margin: 0;">
      Depending on your bank or credit card provider, this credit should appear on your account statement under reference <em>Collections by Chandni / PayU</em>.
    </p>
  `;

  const subject = `Refund Processed: ₹${refundAmount} for Order ${orderNumber} - Collections by Chandni`;
  const text = `Dear ${customerName},

Your refund of ₹${refundAmount} for Order ${orderNumber} has been processed.
Reference: ${bankRef}
Method: ${paymentMethod}
Estimated credit time: 3-5 business days.

Support: ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}
Collections by Chandni`;

  return {
    subject,
    html: baseLayout({ previewText: `Refund of ₹${refundAmount} processed for order ${orderNumber}.`, contentHtml }),
    text,
  };
}

export default {
  renderOrderConfirmedEmail,
  renderPaymentConfirmedEmail,
  renderOrderDispatchedEmail,
  renderOrderCancelledEmail,
  renderRefundProcessedEmail,
};
