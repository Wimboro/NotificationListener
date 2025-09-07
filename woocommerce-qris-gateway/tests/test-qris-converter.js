const QRISConverter = require('../backend-extensions/qris-converter');

/**
 * QRIS Converter Unit Tests
 * 
 * Test the QRIS conversion logic independently
 */

// Test data
const TEST_STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605802ID5922Warung Sayur Bu Sugeng6010Kab. Demak610559567630458C7";
const TEST_AMOUNTS = ["50000", "100000", "250000", "1000000"];

// Helper functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertNotNull(value, message) {
    assert(value !== null && value !== undefined, message || "Value should not be null");
}

function assertEqual(actual, expected, message) {
    assert(actual === expected, message || `Expected ${expected}, got ${actual}`);
}

function assertContains(str, substring, message) {
    assert(str.includes(substring), message || `"${str}" should contain "${substring}"`);
}

// Test cases
class QRISConverterTests {
    
    static runAllTests() {
        console.log("🧪 Running QRIS Converter Tests\n");
        
        const tests = [
            'testBasicConversion',
            'testAmountExtraction',
            'testValidation',
            'testCRC16Calculation',
            'testLengthFormatting',
            'testServiceFee',
            'testErrorHandling',
            'testEdgeCases'
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const testName of tests) {
            try {
                console.log(`Running ${testName}...`);
                this[testName]();
                console.log(`✅ ${testName} passed\n`);
                passed++;
            } catch (error) {
                console.error(`❌ ${testName} failed: ${error.message}\n`);
                failed++;
            }
        }
        
        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        
        if (failed > 0) {
            process.exit(1);
        }
    }
    
    static testBasicConversion() {
        for (const amount of TEST_AMOUNTS) {
            const result = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, amount);
            
            assertNotNull(result, `Conversion should succeed for amount ${amount}`);
            assert(result.length > TEST_STATIC_QRIS.length, "Dynamic QRIS should be longer than static");
            assertContains(result, "010212", "Should be converted to dynamic (010212)");
            
            // Verify amount is embedded
            const extractedAmount = QRISConverter.extractAmount(result);
            assertEqual(extractedAmount, amount, `Extracted amount should match input for ${amount}`);
        }
    }
    
    static testAmountExtraction() {
        // Test amount extraction from dynamic QRIS
        const dynamicQRIS = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "75000");
        const extractedAmount = QRISConverter.extractAmount(dynamicQRIS);
        
        assertEqual(extractedAmount, "75000", "Should extract correct amount");
        
        // Test extraction from static QRIS (should return null)
        const staticAmount = QRISConverter.extractAmount(TEST_STATIC_QRIS);
        assertEqual(staticAmount, null, "Should return null for static QRIS");
        
        // Test invalid QRIS
        const invalidAmount = QRISConverter.extractAmount("invalid_qris");
        assertEqual(invalidAmount, null, "Should return null for invalid QRIS");
    }
    
    static testValidation() {
        // Test valid static QRIS
        assert(QRISConverter.validateQRIS(TEST_STATIC_QRIS), "Should validate correct static QRIS");
        
        // Test dynamic QRIS
        const dynamicQRIS = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50000");
        assert(QRISConverter.validateQRIS(dynamicQRIS), "Should validate generated dynamic QRIS");
        
        // Test invalid inputs
        assert(!QRISConverter.validateQRIS(""), "Should reject empty string");
        assert(!QRISConverter.validateQRIS(null), "Should reject null");
        assert(!QRISConverter.validateQRIS("12345"), "Should reject too short string");
        assert(!QRISConverter.validateQRIS("99999"), "Should reject invalid format");
        
        // Test string without proper format
        const longButInvalid = "x".repeat(100);
        assert(!QRISConverter.validateQRIS(longButInvalid), "Should reject long but invalid string");
    }
    
    static testCRC16Calculation() {
        // Test CRC16 calculation with known values
        const testString = "test";
        const crc = QRISConverter.calculateCRC16(testString);
        
        assert(typeof crc === 'string', "CRC should be string");
        assert(crc.length === 4, "CRC should be 4 characters");
        assert(/^[0-9A-F]+$/.test(crc), "CRC should be uppercase hex");
        
        // Test consistency
        const crc2 = QRISConverter.calculateCRC16(testString);
        assertEqual(crc, crc2, "CRC calculation should be consistent");
        
        // Test different inputs give different results
        const crc3 = QRISConverter.calculateCRC16("different");
        assert(crc !== crc3, "Different inputs should give different CRCs");
    }
    
    static testLengthFormatting() {
        // Test length formatting - this function returns the LENGTH of the string, formatted as 2 digits
        assertEqual(QRISConverter.formatLength("1"), "01", "Single character should have length 01");
        assertEqual(QRISConverter.formatLength("12"), "02", "Two characters should have length 02");
        assertEqual(QRISConverter.formatLength("123"), "03", "Three characters should have length 03");
        assertEqual(QRISConverter.formatLength(""), "00", "Empty string should have length 00");
        
        // Test with actual amounts
        assertEqual(QRISConverter.formatLength("50000"), "05", "Amount 50000 has length 5");
        assertEqual(QRISConverter.formatLength("1000000"), "07", "Amount 1000000 has length 7");
    }
    
    static testServiceFee() {
        // Test with rupiah service fee
        const withRupiahFee = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50000", {
            type: "rupiah",
            value: "5000"
        });
        
        assertNotNull(withRupiahFee, "Should handle rupiah service fee");
        assertContains(withRupiahFee, "55020256", "Should contain rupiah service fee tag");
        
        // Test with percent service fee
        const withPercentFee = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50000", {
            type: "percent",
            value: "3"
        });
        
        assertNotNull(withPercentFee, "Should handle percent service fee");
        assertContains(withPercentFee, "55020357", "Should contain percent service fee tag");
        
        // Test without service fee
        const withoutFee = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50000");
        assertNotNull(withoutFee, "Should work without service fee");
    }
    
    static testErrorHandling() {
        // Test missing parameters
        try {
            QRISConverter.convertStaticToDynamic();
            assert(false, "Should throw error for missing parameters");
        } catch (error) {
            assertContains(error.message, "required", "Error should mention required fields");
        }
        
        // Test invalid amount
        try {
            QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "invalid");
            assert(false, "Should throw error for invalid amount");
        } catch (error) {
            assertContains(error.message, "numeric", "Error should mention numeric requirement");
        }
        
        // Test invalid QRIS format
        try {
            QRISConverter.convertStaticToDynamic("invalid_qris", "50000");
            assert(false, "Should throw error for invalid QRIS");
        } catch (error) {
            assertContains(error.message, "conversion failed", "Error should mention conversion failure");
        }
        
        // Test amount with formatting (should fail)
        try {
            QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50,000");
            assert(false, "Should reject formatted amount");
        } catch (error) {
            assertContains(error.message, "numeric", "Error should mention numeric requirement");
        }
    }
    
    static testEdgeCases() {
        // Test very small amount
        const smallAmount = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "1");
        assertNotNull(smallAmount, "Should handle small amounts");
        assertEqual(QRISConverter.extractAmount(smallAmount), "1", "Should preserve small amounts");
        
        // Test large amount
        const largeAmount = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "99999999");
        assertNotNull(largeAmount, "Should handle large amounts");
        assertEqual(QRISConverter.extractAmount(largeAmount), "99999999", "Should preserve large amounts");
        
        // Test amount with leading zeros (treated as string)
        const zeroAmount = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "000100");
        assertNotNull(zeroAmount, "Should handle amounts with leading zeros");
        assertEqual(QRISConverter.extractAmount(zeroAmount), "000100", "Should preserve leading zeros");
        
        // Test consecutive conversions
        const result1 = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "12345");
        const result2 = QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "12345");
        assertEqual(result1, result2, "Consecutive conversions should be identical");
    }
}

// Benchmark tests
class QRISConverterBenchmarks {
    
    static runBenchmarks() {
        console.log("\n⚡ Running Performance Benchmarks\n");
        
        this.benchmarkConversion();
        this.benchmarkValidation();
        this.benchmarkCRC16();
    }
    
    static benchmarkConversion() {
        const iterations = 1000;
        const startTime = Date.now();
        
        for (let i = 0; i < iterations; i++) {
            QRISConverter.convertStaticToDynamic(TEST_STATIC_QRIS, "50000");
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgTime = duration / iterations;
        
        console.log(`⚡ QRIS Conversion: ${iterations} iterations in ${duration}ms (${avgTime.toFixed(2)}ms/op)`);
    }
    
    static benchmarkValidation() {
        const iterations = 10000;
        const startTime = Date.now();
        
        for (let i = 0; i < iterations; i++) {
            QRISConverter.validateQRIS(TEST_STATIC_QRIS);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgTime = duration / iterations;
        
        console.log(`⚡ QRIS Validation: ${iterations} iterations in ${duration}ms (${avgTime.toFixed(2)}ms/op)`);
    }
    
    static benchmarkCRC16() {
        const iterations = 10000;
        const testString = TEST_STATIC_QRIS.substring(0, TEST_STATIC_QRIS.length - 4);
        const startTime = Date.now();
        
        for (let i = 0; i < iterations; i++) {
            QRISConverter.calculateCRC16(testString);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgTime = duration / iterations;
        
        console.log(`⚡ CRC16 Calculation: ${iterations} iterations in ${duration}ms (${avgTime.toFixed(2)}ms/op)`);
    }
}

// Main execution
if (require.main === module) {
    try {
        QRISConverterTests.runAllTests();
        QRISConverterBenchmarks.runBenchmarks();
        console.log("\n🎉 All tests completed successfully!");
    } catch (error) {
        console.error("\n💥 Test execution failed:", error.message);
        process.exit(1);
    }
}

module.exports = { QRISConverterTests, QRISConverterBenchmarks };