// Test script to validate our QRIS implementation against the reference
import { QRISConverter } from './src/qris-converter.js';

// Test QRIS from the reference repository
const testQRIS = "00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605802ID5922Warung Sayur Bu Sugeng6010Kab. Demak610559567630458C7";

console.log('Testing QRIS validation...');
console.log('QRIS:', testQRIS);
console.log('Length:', testQRIS.length);

// Check CRC manually
const qrisWithoutCRC = testQRIS.slice(0, -4);
const providedCRC = testQRIS.slice(-4);
console.log('Provided CRC:', providedCRC);

// Test our CRC calculation
const calculatedCRC = QRISConverter.calculateCRC16(qrisWithoutCRC + '6304');
console.log('Calculated CRC:', calculatedCRC);
console.log('CRC matches:', providedCRC === calculatedCRC);

// Test validation
const isValid = QRISConverter.validateQRIS(testQRIS);
console.log('Validation result:', isValid);

// Test the reference implementation approach manually
console.log('\n--- Manual Reference Implementation Test ---');

// Step 1: Remove CRC
const step0 = testQRIS.slice(0, -4);
console.log('Without CRC:', step0);

// Step 2: Change 010211 to 010212
const step1 = step0.replace('010211', '010212');
console.log('Changed to dynamic:', step1);

// Step 3: Split by 5802ID
const parts = step1.split('5802ID');
console.log('Parts:', parts.length, parts);

// Step 4: Add amount
const amount = '50000';
const amountField = `54${amount.length.toString().padStart(2, '0')}${amount}`;
console.log('Amount field:', amountField);

// Step 5: Reconstruct
const reconstructed = parts[0] + amountField + '5802ID' + parts[1];
console.log('Reconstructed:', reconstructed);

// Step 6: Calculate CRC
const finalCRC = QRISConverter.calculateCRC16(reconstructed + '6304');
console.log('Final CRC:', finalCRC);

const finalQRIS = reconstructed + '6304' + finalCRC;
console.log('Final QRIS:', finalQRIS);
console.log('Final length:', finalQRIS.length);

// Test with our converter
try {
  const converted = QRISConverter.convertStaticToDynamic(testQRIS, amount);
  console.log('\nOur converter result:', converted);
  console.log('Our result length:', converted.length);
  console.log('Results match:', converted === finalQRIS);
} catch (error) {
  console.error('Conversion error:', error.message);
}