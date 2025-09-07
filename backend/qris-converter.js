/**
 * QRIS Static to Dynamic Converter
 * Based on: https://github.com/verssache/qris-dinamis
 * 
 * This module converts static QRIS codes to dynamic ones with specific amounts
 * for WooCommerce payment gateway integration.
 */

class QRISConverter {
    /**
     * Convert static QRIS to dynamic QRIS with amount
     * @param {string} staticQRIS - The static QRIS code
     * @param {string|number} amount - The payment amount (numeric string without formatting)
     * @param {Object} serviceFee - Optional service fee configuration
     * @returns {string} Dynamic QRIS code
     */
    static convertStaticToDynamic(staticQRIS, amount, serviceFee = null) {
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
            let amountField = '54' + this.formatLength(amountStr) + amountStr;
            
            // Add service fee if provided
            if (serviceFee) {
                if (serviceFee.type === 'rupiah') {
                    const feeStr = serviceFee.value.toString();
                    amountField += '55020256' + this.formatLength(feeStr) + feeStr;
                } else if (serviceFee.type === 'percent') {
                    const feeStr = serviceFee.value.toString();
                    amountField += '55020357' + this.formatLength(feeStr) + feeStr;
                }
            }
            
            // Add back merchant country code
            amountField += '5802ID';
            
            // Combine all parts
            const qrisWithAmount = parts[0] + amountField + parts[1];
            
            // Calculate and append CRC16 checksum
            const crc = this.calculateCRC16(qrisWithAmount);
            
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
    static formatLength(str) {
        const length = str.length.toString();
        return length.length === 1 ? '0' + length : length;
    }
    
    /**
     * Calculate CRC16 checksum for QRIS
     * @param {string} str - Input string for checksum calculation
     * @returns {string} 4-character uppercase hex CRC16
     */
    static calculateCRC16(str) {
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
    static validateQRIS(qris) {
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
    static extractAmount(qris) {
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
}

module.exports = QRISConverter;