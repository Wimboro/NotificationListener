/**
 * QRIS Converter for Cloudflare Workers
 * 
 * Lightweight QRIS code conversion utility for serverless environments
 */

/**
 * Calculate CRC16 checksum for QRIS
 * @param {string} str - Input string for checksum calculation
 * @returns {string} 4-character uppercase hex CRC16
 */
function calculateCRC16(str) {
  let crc = 0xFFFF;
  
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  const hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.length === 3 ? '0' + hex : hex;
}

/**
 * Validate QRIS code format
 * @param {string} qris - QRIS code to validate
 * @returns {boolean} True if valid format
 */
function validateQRIS(qris) {
  try {
    // Basic length check (QRIS should be reasonable length)
    if (!qris || qris.length < 50 || qris.length > 500) {
      return false;
    }
    
    // Check if it starts with proper format indicator
    if (!qris.startsWith('00020')) {
      return false;
    }
    
    // Check if it contains merchant location
    if (!qris.includes('5802ID')) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract amount from dynamic QRIS (for verification)
 * @param {string} qris - Dynamic QRIS code
 * @returns {string|null} Extracted amount or null if not found
 */
function extractAmount(qris) {
  try {
    // Look for amount field (Tag 54)
    const amountMatch = qris.match(/54(\d{2})(\d+)/);
    if (amountMatch) {
      const length = parseInt(amountMatch[1], 10);
      const restOfString = amountMatch[2];
      
      // Extract exactly 'length' characters as the amount
      if (restOfString.length >= length) {
        return restOfString.substring(0, length);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert static QRIS to dynamic QRIS with amount
 * @param {string} staticQRIS - The static QRIS code
 * @param {string|number} amount - The payment amount (numeric string without formatting)
 * @param {Object} serviceFee - Optional service fee configuration
 * @returns {string} Dynamic QRIS code
 */
function convertStaticToDynamic(staticQRIS, amount, serviceFee = null) {
  try {
    // Validate inputs
    if (!staticQRIS || !amount) {
      throw new Error('Static QRIS and amount are required');
    }

    // Ensure amount is string and numeric
    const amountStr = amount.toString();
    if (!/^\d+$/.test(amountStr)) {
      throw new Error('Amount must be numeric string without formatting');
    }

    // Remove the last 4 characters (CRC16 checksum)
    const qrisWithoutCRC = staticQRIS.substring(0, staticQRIS.length - 4);
    
    // Change from static (010211) to dynamic (010212)
    const step1 = qrisWithoutCRC.replace('010211', '010212');
    
    // Split by merchant location identifier
    const parts = step1.split('5802ID');
    
    if (parts.length !== 2) {
      throw new Error('Invalid QRIS format: missing merchant location');
    }
    
    // Format amount field with length prefix (Tag 54)
    let amountField = '54' + formatLength(amountStr) + amountStr;
    
    // Add service fee if provided
    if (serviceFee) {
      if (serviceFee.type === 'rupiah') {
        const feeStr = serviceFee.value.toString();
        amountField += '55020256' + formatLength(feeStr) + feeStr;
      } else if (serviceFee.type === 'percent') {
        const feeStr = serviceFee.value.toString();
        amountField += '55020357' + formatLength(feeStr) + feeStr;
      }
    }
    
    // Add back merchant country code
    amountField += '5802ID';
    
    // Combine all parts
    const qrisWithAmount = parts[0] + amountField + parts[1];
    
    // Calculate and append CRC16 checksum
    const crc = calculateCRC16(qrisWithAmount);
    
    return qrisWithAmount + crc;
    
  } catch (error) {
    throw new Error(`QRIS conversion failed: ${error.message}`);
  }
}

/**
 * Format string length as 2-digit padded string
 * @param {string} str - Input string
 * @returns {string} 2-digit length
 */
function formatLength(str) {
  const length = str.length.toString();
  return length.length === 1 ? '0' + length : length;
}

/**
 * Parse QRIS data into structured format
 */
function parseQRIS(qris) {
  if (!validateQRIS(qris)) {
    throw new Error('Invalid QRIS format');
  }
  
  const result = {
    valid: true,
    type: qris.startsWith('000201') ? 'static' : 'dynamic',
    payloadFormat: qris.slice(4, 6),
    amount: extractAmount(qris),
    merchantInfo: {},
    additionalInfo: {}
  };
  
  // Extract merchant account information (26-51)
  let pos = 6; // Skip payload format indicator
  
  while (pos < qris.length - 4) { // -4 for CRC
    const tag = qris.slice(pos, pos + 2);
    const lengthStr = qris.slice(pos + 2, pos + 4);
    const length = parseInt(lengthStr, 10);
    
    if (isNaN(length) || pos + 4 + length > qris.length) {
      break;
    }
    
    const value = qris.slice(pos + 4, pos + 4 + length);
    
    // Store relevant fields
    switch (tag) {
      case '52': // Merchant Category Code
        result.merchantInfo.categoryCode = value;
        break;
      case '53': // Transaction Currency
        result.merchantInfo.currency = value;
        break;
      case '58': // Country Code
        result.merchantInfo.countryCode = value;
        break;
      case '59': // Merchant Name
        result.merchantInfo.name = value;
        break;
      case '60': // Merchant City
        result.merchantInfo.city = value;
        break;
      case '61': // Postal Code
        result.merchantInfo.postalCode = value;
        break;
    }
    
    pos += 4 + length;
  }
  
  return result;
}

/**
 * Generate sample QRIS for testing
 */
function generateSampleQRIS(merchantName = 'Test Merchant', amount = null) {
  // Use a more realistic QRIS structure based on Indonesian standards
  let qris = '000201'; // Payload format indicator - static
  qris += '010211'; // Point of initiation method - static
  
  // Merchant account information (using ID.CO.QRIS.WWW format)
  qris += '26580011ID.CO.QRIS.WWW0118ID20232109044804290215ID2023210904480429030403UMI';
  
  // Additional merchant info if needed
  qris += '51440014ID.CO.QRIS.WWW02150ID2023210904480429030403UMI';
  
  // Merchant category code
  qris += '52044812';
  
  // Transaction currency (IDR)
  qris += '5303360';
  
  // Transaction amount (if provided)
  if (amount) {
    const amountStr = amount.toString();
    qris += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  }
  
  // Country code
  qris += '5802ID';
  
  // Merchant name
  const merchantNameLength = merchantName.length.toString().padStart(2, '0');
  qris += `59${merchantNameLength}${merchantName}`;
  
  // Merchant city
  qris += '6007Jakarta';
  
  // Calculate CRC16
  const crc = calculateCRC16(qris + '6304');
  qris += `6304${crc}`;
  
  return qris;
}

// Export for Cloudflare Workers
export const QRISConverter = {
  validateQRIS,
  extractAmount,
  convertStaticToDynamic,
  parseQRIS,
  generateSampleQRIS,
  calculateCRC16
};

// Export individual functions for compatibility
export {
  validateQRIS,
  extractAmount,
  convertStaticToDynamic,
  parseQRIS,
  generateSampleQRIS,
  calculateCRC16
};

// Default export for compatibility
export default QRISConverter;