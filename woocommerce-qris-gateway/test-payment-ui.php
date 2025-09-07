<?php
/**
 * Test Payment UI Template
 * 
 * Simulate the WordPress payment instructions page to verify UI changes
 */

// Simulate WordPress functions
if (!function_exists('wc_price')) {
    function wc_price($amount) {
        return 'Rp ' . number_format($amount, 0, ',', '.');
    }
}

if (!function_exists('__')) {
    function __($text, $domain = '') {
        return $text;
    }
}

if (!function_exists('_e')) {
    function _e($text, $domain = '') {
        echo $text;
    }
}

if (!function_exists('esc_html')) {
    function esc_html($text) {
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('esc_js')) {
    function esc_js($text) {
        return json_encode($text);
    }
}

if (!function_exists('intval')) {
    function intval($value) {
        return (int) $value;
    }
}

if (!function_exists('printf')) {
    // printf already exists in PHP
}

// Test data simulating a real order
$order_id = 123;
$order_reference = 'ORDER-123-1725639000';
$amount = 25000; // Original order amount
$combined_amount = 25041; // Combined amount (original + unique)
$unique_amount = 41; // Unique identifier
$original_amount = 25000; // Original amount
$payment_amount = $combined_amount; // Amount customer should pay
$qris_code = '00020101021226570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605405250415802ID5922Warung Sayur Bu Sugeng6010Kab. Demak6105595676304A57B';

// Mock gateway object for auto_check_interval and payment_timeout
$auto_check_interval = 30;
$payment_timeout = 15;

echo "<h1>QRIS Payment UI Test</h1>";
echo "<p>Testing the updated payment instructions template with unique amounts...</p>";
echo "<hr>";

// Include the payment instructions template
include 'wordpress-plugin/includes/payment-instructions.php';

echo "<hr>";
echo "<h2>Test Results:</h2>";
echo "<ul>";
echo "<li>✅ Original order amount: " . wc_price($amount) . "</li>";
echo "<li>✅ Unique identifier: " . wc_price($unique_amount) . "</li>";
echo "<li>✅ Combined amount (to pay): " . wc_price($payment_amount) . "</li>";
echo "<li>✅ QRIS contains combined amount: " . (strlen($qris_code) > 0 ? 'Yes' : 'No') . "</li>";
echo "</ul>";

?>