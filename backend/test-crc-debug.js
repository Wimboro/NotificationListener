// Debug CRC calculation step by step
function calculateCRC16Debug(str) {
  console.log('Input string:', str);
  console.log('Input length:', str.length);
  
  let crc = 0xFFFF;
  console.log('Initial CRC:', crc.toString(16));
  
  for (let c = 0; c < str.length; c++) {
    const charCode = str.charCodeAt(c);
    const char = str.charAt(c);
    console.log(`[${c}] char: '${char}' charCode: ${charCode} (0x${charCode.toString(16)})`);
    
    crc ^= charCode << 8;
    console.log(`  After XOR: 0x${crc.toString(16)}`);
    
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
        console.log(`    [${i}] Left shift + XOR: 0x${crc.toString(16)}`);
      } else {
        crc = crc << 1;
        console.log(`    [${i}] Left shift: 0x${crc.toString(16)}`);
      }
    }
    console.log(`  Final for char: 0x${crc.toString(16)}`);
    
    if (c > 5) break; // Only show first few chars for debugging
  }
  
  const finalCrc = crc & 0xFFFF;
  let hex = finalCrc.toString(16).toUpperCase();
  if (hex.length === 3) hex = "0" + hex;
  while (hex.length < 4) hex = "0" + hex;
  
  console.log('Final CRC after mask:', finalCrc.toString(16));
  console.log('Final hex:', hex);
  return hex;
}

// Test with a simple string first
console.log('=== Testing simple string ===');
calculateCRC16Debug('ABC');

console.log('\n=== Testing QRIS string ===');
const testStr = '00020101021126580011ID.CO.QRIS.WWW01186304';
calculateCRC16Debug(testStr);