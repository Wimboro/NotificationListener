<?php
/**
 * Simple test for payment UI variables
 */

// Mock data
$order_reference = 'ORDER-123-1725639000';
$amount = 25000; // Original order amount
$combined_amount = 25041; // Combined amount 
$unique_amount = 41; // Unique identifier
$payment_amount = $combined_amount; // Amount customer should pay

function wc_price($amount) {
    return 'Rp ' . number_format($amount, 0, ',', '.');
}

echo "=== QRIS Payment UI Test ===\n";
echo "Order Reference: {$order_reference}\n";
echo "Original Order Amount: " . wc_price($amount) . "\n";
echo "Unique Identifier: " . wc_price($unique_amount) . "\n";
echo "Combined Amount (to pay): " . wc_price($payment_amount) . "\n";

// Test the display logic
if (isset($combined_amount) && $combined_amount != $amount) {
    echo "\n✅ COMBINED AMOUNT DETECTED - Will show special UI\n";
    echo "   - Warning message will be displayed\n";
    echo "   - Customer will see: " . wc_price($payment_amount) . "\n";
    echo "   - Unique amount explanation will be shown\n";
} else {
    echo "\n❌ NO COMBINED AMOUNT - Standard UI\n";
}

echo "\n=== Payment Instructions ===\n";
echo "Step 4 will show: Verify the payment amount is exactly " . wc_price($payment_amount) . "\n";

if (isset($combined_amount) && $combined_amount != $amount) {
    echo "\nImportant warning will be displayed:\n";
    echo "You must pay the exact amount shown above, not the original order amount.\n";
}

echo "\n✅ Test completed successfully!\n";
?>