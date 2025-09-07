// Test script to generate valid QRIS
import { QRISConverter } from './src/qris-converter.js';

// Generate a sample QRIS
const sampleQRIS = QRISConverter.generateSampleQRIS('Test Merchant');
console.log('Generated QRIS:', sampleQRIS);
console.log('QRIS Length:', sampleQRIS.length);

// Check CRC manually
const qrisWithoutCRC = sampleQRIS.slice(0, -4);
const providedCRC = sampleQRIS.slice(-4);
const calculatedCRC = QRISConverter.calculateCRC16(qrisWithoutCRC + '6304');
console.log('QRIS without CRC:', qrisWithoutCRC);
console.log('Provided CRC:', providedCRC);
console.log('Calculated CRC:', calculatedCRC);

// Validate it
const isValid = QRISConverter.validateQRIS(sampleQRIS);
console.log('Is valid:', isValid);

// Test with a known working QRIS if available
const workingQRIS = '00020101021126580011ID.CO.QRIS.WWW0118ID20232109044804290215ID2023210904480429030403UMI51440014ID.CO.QRIS.WWW02150ID2023210904480429030403UMI5204481253033605802ID5913Test Merchant6007Jakarta6304C2A3';
console.log('Working QRIS valid:', QRISConverter.validateQRIS(workingQRIS));