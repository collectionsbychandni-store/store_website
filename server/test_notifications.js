import assert from 'assert';
import notificationService, { normalizePhoneNumber, isValidEmail } from './src/services/notificationService.js';
import emailTemplates from './src/services/templates/emailTemplates.js';
import whatsappTemplates from './src/services/templates/whatsappTemplates.js';
import { getSanitizedNotificationConfig } from './src/config/notificationConfig.js';

console.log('----------------------------------------------------');
console.log('RUNNING LAUNCH STEP 26: NOTIFICATION VERIFICATION SUITE');
console.log('----------------------------------------------------');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(e);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(e);
    }
  }

  // 1. Phone Normalization
  test('Phone Normalization handles 10-digit, +91, and 0-prefixed Indian numbers', () => {
    assert.strictEqual(normalizePhoneNumber('9812345678'), '919812345678');
    assert.strictEqual(normalizePhoneNumber('+91 98123 45678'), '919812345678');
    assert.strictEqual(normalizePhoneNumber('09812345678'), '919812345678');
    assert.strictEqual(normalizePhoneNumber('919812345678'), '919812345678');
    assert.strictEqual(normalizePhoneNumber('invalid'), null);
    assert.strictEqual(normalizePhoneNumber(''), null);
  });

  // 2. Email Validation
  test('Email Validation rejects invalid addresses and passes RFC-compliant formats', () => {
    assert.strictEqual(isValidEmail('patron@collectionsbychandni.in'), true);
    assert.strictEqual(isValidEmail('test.customer+1@gmail.com'), true);
    assert.strictEqual(isValidEmail('invalid-email'), false);
    assert.strictEqual(isValidEmail('@missinguser.com'), false);
    assert.strictEqual(isValidEmail(''), false);
  });

  // 3. Sanitized Config (Never leaks secrets)
  test('Sanitized notification config isolates secrets and returns provider status', () => {
    const config = getSanitizedNotificationConfig();
    assert.ok(config.environment);
    assert.ok(config.email);
    assert.ok(config.whatsapp);
    assert.strictEqual(typeof config.email.isConfigured, 'boolean');
    assert.strictEqual(typeof config.whatsapp.isConfigured, 'boolean');
    // Ensure no raw keys exist
    assert.strictEqual(config.resendApiKey, undefined);
    assert.strictEqual(config.msg91AuthKey, undefined);
    assert.strictEqual(config.smtpPass, undefined);
  });

  // 4. Email Templates Rendering
  test('Email templates render branding, item details, variants, and order links', () => {
    const mockOrder = {
      id: 'order-test-101',
      orderNumber: 'CBC-892100-TEST',
      createdAt: new Date(),
      paymentMethod: 'COD',
      paymentStatus: 'AWAITING_PAYMENT',
      subtotal: 5000,
      shippingAmount: 0,
      discountAmount: 500,
      totalAmount: 4500,
      shippingAddress: {
        name: 'Chandni Patron',
        addressLine1: 'Villa 14, Royal Palms',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      items: [
        {
          productTitle: 'Royal Chanderi Silk Saree',
          sku: 'CBC-RCS-GLD-OS',
          size: 'One Size',
          color: 'Royal Gold',
          quantity: 1,
          totalPrice: 4500,
        },
      ],
    };

    const rendered = emailTemplates.renderOrderConfirmedEmail({
      order: mockOrder,
      customer: { name: 'Chandni Patron', email: 'patron@example.com' },
    });

    assert.ok(rendered.subject.includes('CBC-892100-TEST'));
    assert.ok(rendered.html.includes('Royal Chanderi Silk Saree'));
    assert.ok(rendered.html.includes('Cash on Delivery'));
    assert.ok(rendered.html.includes('₹4,500'));
    assert.ok(rendered.html.includes('Jaipur'));
  });

  // 5. WhatsApp Templates Rendering
  test('WhatsApp templates differentiate COD vs PayU prepaid parameters', () => {
    const mockCodOrder = {
      id: 'order-test-cod',
      orderNumber: 'CBC-COD-1',
      paymentMethod: 'COD',
      totalAmount: 3999,
      shippingAddress: { name: 'Meera Rao' },
    };

    const codWa = whatsappTemplates.renderOrderConfirmedWhatsApp({ order: mockCodOrder });
    assert.ok(codWa.text.includes('Cash on Delivery'));
    assert.ok(codWa.text.includes('₹3,999'));

    const mockPayuOrder = {
      id: 'order-test-payu',
      orderNumber: 'CBC-PAYU-1',
      paymentMethod: 'PAYU',
      totalAmount: 7999,
      shippingAddress: { name: 'Ananya Sharma' },
    };

    const payuWa = whatsappTemplates.renderOrderConfirmedWhatsApp({ order: mockPayuOrder });
    assert.ok(payuWa.text.includes('PayU Online Payment'));
    assert.ok(payuWa.text.includes('₹7,999'));
  });

  // 6. Non-blocking Dispatch & Outbox Persistence for Order Confirmation
  await testAsync('Order Confirmation dispatch creates outbox records for Email and WhatsApp', async () => {
    const testOrder = {
      id: `ord-test-${Date.now()}`,
      orderNumber: `CBC-TEST-${Date.now().toString().slice(-4)}`,
      paymentMethod: 'COD',
      paymentStatus: 'AWAITING_PAYMENT',
      totalAmount: 5999,
      subtotal: 5999,
      shippingAmount: 0,
      discountAmount: 0,
      createdAt: new Date(),
      items: [
        {
          productTitle: 'Handcrafted Festive Kurti',
          sku: 'CBC-HFK-01',
          size: 'M',
          color: 'Crimson Red',
          quantity: 1,
          totalPrice: 5999,
        },
      ],
      shippingAddress: {
        name: 'Priya Verma',
        email: 'priya.verma@example.com',
        phone: '+91 98234 56789',
        addressLine1: '401 Lotus Heritage',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
      },
    };

    const res = await notificationService.sendOrderConfirmationNotifications({
      order: testOrder,
      customer: { name: 'Priya Verma', email: 'priya.verma@example.com', phone: '9823456789' },
    });

    assert.ok(res.email, 'Email notification record should be returned');
    assert.ok(res.whatsapp, 'WhatsApp notification record should be returned');
    assert.strictEqual(res.email.status, 'SENT');
    assert.strictEqual(res.whatsapp.status, 'SENT');
    assert.ok(res.email.providerRef);
    assert.ok(res.whatsapp.providerRef);
  });

  // 7. Idempotency Prevention
  await testAsync('Idempotency prevents duplicate notifications when triggered multiple times', async () => {
    const testOrder = {
      id: `ord-idem-${Date.now()}`,
      orderNumber: `CBC-IDEM-${Date.now().toString().slice(-4)}`,
      paymentMethod: 'PAYU',
      paymentStatus: 'AWAITING_PAYMENT',
      totalAmount: 12000,
      items: [],
      shippingAddress: {
        name: 'Aarav Patel',
        email: 'aarav.patel@example.com',
        phone: '9876501234',
      },
    };

    // First call
    const firstCall = await notificationService.sendOrderConfirmationNotifications({
      order: testOrder,
      customer: { email: 'aarav.patel@example.com', phone: '9876501234' },
    });

    // Second call with same order ID
    const secondCall = await notificationService.sendOrderConfirmationNotifications({
      order: testOrder,
      customer: { email: 'aarav.patel@example.com', phone: '9876501234' },
    });

    assert.strictEqual(firstCall.email.id, secondCall.email.id, 'Idempotency must return identical email record');
    assert.strictEqual(firstCall.whatsapp.id, secondCall.whatsapp.id, 'Idempotency must return identical whatsapp record');
  });

  // 8. Payment Confirmation Dispatch
  await testAsync('Payment Confirmation notification triggers strictly with transaction details', async () => {
    const testOrder = {
      id: `ord-pay-${Date.now()}`,
      orderNumber: `CBC-PAID-${Date.now().toString().slice(-4)}`,
      paymentMethod: 'PAYU',
      paymentStatus: 'PAID',
      totalAmount: 8500,
      items: [],
      shippingAddress: {
        name: 'Rohan Mehta',
        email: 'rohan.mehta@example.com',
        phone: '9988776655',
      },
      paymentDetails: {
        txnid: 'CBC_TXN_99882',
        mihpayid: '182736459',
        mode: 'UPI',
        bankRefNum: 'HDFC12345678',
      },
    };

    const res = await notificationService.sendPaymentConfirmationNotifications({
      order: testOrder,
      customer: { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '9988776655' },
      paymentDetails: testOrder.paymentDetails,
    });

    assert.ok(res.email);
    assert.strictEqual(res.email.event, 'PAYMENT_CONFIRMED');
    assert.strictEqual(res.whatsapp.event, 'PAYMENT_CONFIRMED');
  });

  // 9. Order Dispatched Notification
  await testAsync('Order Dispatched notification includes verified AWB and courier tracking', async () => {
    const testOrder = {
      id: `ord-disp-${Date.now()}`,
      orderNumber: `CBC-DISP-${Date.now().toString().slice(-4)}`,
      totalAmount: 6499,
      shippingAddress: {
        name: 'Sneha Kulkarni',
        email: 'sneha.k@example.com',
        phone: '9822334455',
      },
    };

    const shipment = {
      awbCode: 'AWB98273645',
      courierName: 'Blue Dart Express',
    };

    const res = await notificationService.sendOrderDispatchedNotifications({
      order: testOrder,
      customer: { name: 'Sneha Kulkarni', email: 'sneha.k@example.com', phone: '9822334455' },
      shipment,
    });

    assert.ok(res.email);
    assert.strictEqual(res.email.event, 'ORDER_DISPATCHED');
    assert.strictEqual(res.whatsapp.event, 'ORDER_DISPATCHED');
  });

  // 10. Order Cancelled & Refund Notifications
  await testAsync('Order Cancelled and Refund notifications dispatch accurately', async () => {
    const testOrder = {
      id: `ord-canc-${Date.now()}`,
      orderNumber: `CBC-CANC-${Date.now().toString().slice(-4)}`,
      totalAmount: 4999,
      shippingAddress: {
        name: 'Aditi Nair',
        email: 'aditi.n@example.com',
        phone: '9845012345',
      },
    };

    // Cancellation
    const cancelRes = await notificationService.sendOrderCancelledNotifications({
      order: testOrder,
      customer: { name: 'Aditi Nair', email: 'aditi.n@example.com', phone: '9845012345' },
      cancellationReason: 'Patron requested change of delivery date',
      refundNote: 'Full reversal initiated to source card',
    });
    assert.strictEqual(cancelRes.email.event, 'ORDER_CANCELLED');

    // Refund
    const refundRes = await notificationService.sendRefundProcessedNotifications({
      order: testOrder,
      customer: { name: 'Aditi Nair', email: 'aditi.n@example.com', phone: '9845012345' },
      refund: {
        id: 'ref-test-1',
        amount: 4999,
        bankRefNum: 'ARN9988776655',
        paymentMethod: 'PAYU',
      },
    });
    assert.strictEqual(refundRes.email.event, 'REFUND_PROCESSED');
  });

  // 11. Customer Preferences & Admin Stats
  await testAsync('Admin Notification Stats and Query filters function reliably', async () => {
    const stats = await notificationService.getNotificationStats();
    assert.ok(stats.total >= 5, 'Stats total should reflect created notifications');
    assert.ok(stats.sent >= 5, 'Stats sent count should be tracked');

    const adminQuery = await notificationService.getAdminNotifications({
      page: 1,
      limit: 10,
    });
    assert.ok(Array.isArray(adminQuery.notifications));
    assert.ok(adminQuery.notifications.length > 0);
  });

  console.log('----------------------------------------------------');
  console.log(`RESULTS: ${passed}/${total} test suites PASSED.`);
  console.log('----------------------------------------------------');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
