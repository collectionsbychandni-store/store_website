import crypto from 'crypto';

/**
 * Collections by Chandni - PayU Hosted Checkout Configuration & Cryptographic Helpers
 *
 * Implements Launch Step 21:
 * - PayU India standard hosted checkout integration
 * - SHA-512 request checksum hashing
 * - SHA-512 reverse response checksum verification
 * - S2S postservice payment verification hashing
 * - Environment-aware endpoint resolution (test vs production)
 */

export const PAYU_KEY = process.env.PAYU_KEY || 'gtKFFx';
export const PAYU_SALT = process.env.PAYU_SALT || 'eCwWELxi';
export const PAYU_ENV = (process.env.PAYU_ENV || 'test').toLowerCase();

export const PAYU_ENDPOINTS = {
  test: {
    paymentUrl: 'https://test.payu.in/_payment',
    verifyUrl: 'https://test.payu.in/merchant/postservice.php?form=2',
  },
  production: {
    paymentUrl: 'https://secure.payu.in/_payment',
    verifyUrl: 'https://info.payu.in/merchant/postservice.php?form=2',
  },
};

/**
 * Returns the active payment gateway URL based on validated server configuration
 */
export function getPaymentGatewayUrl() {
  if (PAYU_ENV === 'production') {
    return PAYU_ENDPOINTS.production.paymentUrl;
  }
  return PAYU_ENDPOINTS.test.paymentUrl;
}

/**
 * Returns the S2S verification endpoint URL
 */
export function getVerifyServiceUrl() {
  if (process.env.PAYU_VERIFY_URL) {
    return process.env.PAYU_VERIFY_URL;
  }
  if (PAYU_ENV === 'production') {
    return PAYU_ENDPOINTS.production.verifyUrl;
  }
  return PAYU_ENDPOINTS.test.verifyUrl;
}

/**
 * Generates SHA-512 request hash for PayU Hosted Checkout
 * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
export function generateRequestHash({
  key = PAYU_KEY,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
  salt = PAYU_SALT,
}) {
  const formattedAmount = Number(amount).toFixed(2);
  const cleanProductInfo = String(productinfo || 'Collections by Chandni Order').trim();
  const cleanFirstName = String(firstname || 'Patron').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  const hashSequence = [
    key,
    txnid,
    formattedAmount,
    cleanProductInfo,
    cleanFirstName,
    cleanEmail,
    udf1 || '',
    udf2 || '',
    udf3 || '',
    udf4 || '',
    udf5 || '',
    '', // udf6
    '', // udf7
    '', // udf8
    '', // udf9
    '', // udf10
    salt,
  ].join('|');

  return crypto.createHash('sha512').update(hashSequence).digest('hex').toLowerCase();
}

/**
 * Verifies reverse SHA-512 hash returned from PayU in payment response
 *
 * If additionalCharges is present:
 * sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 * If additionalCharges is not present:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyResponseHash(responseParams = {}, salt = PAYU_SALT) {
  const {
    key = PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    status,
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    additionalCharges,
    hash,
  } = responseParams;

  if (!hash) {
    return {
      isValid: false,
      reason: 'Missing response hash from payment gateway',
    };
  }

  const formattedAmount = Number(amount).toFixed(2);
  const cleanProductInfo = String(productinfo || '').trim();
  const cleanFirstName = String(firstname || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  let hashSequence;
  if (additionalCharges) {
    hashSequence = [
      additionalCharges,
      salt,
      status,
      '', // udf10
      '', // udf9
      '', // udf8
      '', // udf7
      '', // udf6
      udf5 || '',
      udf4 || '',
      udf3 || '',
      udf2 || '',
      udf1 || '',
      cleanEmail,
      cleanFirstName,
      cleanProductInfo,
      formattedAmount,
      txnid,
      key,
    ].join('|');
  } else {
    hashSequence = [
      salt,
      status,
      '', // udf10
      '', // udf9
      '', // udf8
      '', // udf7
      '', // udf6
      udf5 || '',
      udf4 || '',
      udf3 || '',
      udf2 || '',
      udf1 || '',
      cleanEmail,
      cleanFirstName,
      cleanProductInfo,
      formattedAmount,
      txnid,
      key,
    ].join('|');
  }

  const calculatedHash = crypto.createHash('sha512').update(hashSequence).digest('hex').toLowerCase();
  const receivedHash = String(hash).trim().toLowerCase();

  const isValid = calculatedHash === receivedHash;

  return {
    isValid,
    calculatedHash,
    receivedHash,
    reason: isValid ? 'Checksum verified successfully' : 'Checksum hash mismatch',
  };
}

/**
 * Generates SHA-512 hash for PayU S2S verify_payment command
 * Formula: sha512(key|command|var1|SALT)
 */
export function generateVerifyPaymentHash({
  key = PAYU_KEY,
  command = 'verify_payment',
  var1, // txnid
  salt = PAYU_SALT,
}) {
  const hashString = `${key}|${command}|${var1}|${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
}

/**
 * Generates SHA-512 hash for PayU cancel_refund_transaction command
 * Formula: sha512(key|command|var1|SALT)
 * where var1 is mihpayid (PayU payment ID)
 */
export function generateRefundHash({
  key = PAYU_KEY,
  command = 'cancel_refund_transaction',
  var1, // mihpayid
  salt = PAYU_SALT,
}) {
  const hashString = `${key}|${command}|${var1}|${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
}

/**
 * Generates SHA-512 hash for PayU check_action_status command
 * Formula: sha512(key|command|var1|SALT)
 * where var1 is refund request_id or token
 */
export function generateCheckActionStatusHash({
  key = PAYU_KEY,
  command = 'check_action_status',
  var1,
  salt = PAYU_SALT,
}) {
  const hashString = `${key}|${command}|${var1}|${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
}

export default {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_ENV,
  PAYU_ENDPOINTS,
  getPaymentGatewayUrl,
  getVerifyServiceUrl,
  generateRequestHash,
  verifyResponseHash,
  generateVerifyPaymentHash,
  generateRefundHash,
  generateCheckActionStatusHash,
};
