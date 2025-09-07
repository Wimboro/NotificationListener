<?php
/**
 * Plugin Name: QRIS Dynamic Payment Gateway
 * Plugin URI: https://github.com/Wimboro/NotificationListener
 * Description: WooCommerce payment gateway using dynamic QRIS with Android notification confirmation
 * Version: 1.0.0
 * Author: Wimboro
 * License: GPL v2 or later
 * Requires at least: 5.0
 * Tested up to: 6.4
 * WC requires at least: 3.0
 * WC tested up to: 8.0
 * Text Domain: qris-dynamic-gateway
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('QRIS_PLUGIN_VERSION', '1.0.0');
define('QRIS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('QRIS_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Check if WooCommerce is active
add_action('plugins_loaded', 'qris_dynamic_init');

function qris_dynamic_init() {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'qris_dynamic_woocommerce_missing_notice');
        return;
    }
    
    // Check if WC_Payment_Gateway exists
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }
    
    // Include the gateway class
    include_once QRIS_PLUGIN_PATH . 'includes/class-qris-dynamic-gateway.php';
    
    // Add the gateway to WooCommerce
    add_filter('woocommerce_payment_gateways', 'qris_add_gateway_class');
}

function qris_add_gateway_class($gateways) {
    $gateways[] = 'QRIS_Dynamic_Gateway';
    return $gateways;
}

function qris_dynamic_woocommerce_missing_notice() {
    echo '<div class="error"><p><strong>' . sprintf(
        esc_html__('QRIS Dynamic Payment Gateway requires WooCommerce to be installed and active. You can download %s here.', 'qris-dynamic-gateway'),
        '<a href="https://woocommerce.com/" target="_blank">WooCommerce</a>'
    ) . '</strong></p></div>';
}

// AJAX handlers
add_action('wp_ajax_qris_check_payment', 'qris_check_payment_status');
add_action('wp_ajax_nopriv_qris_check_payment', 'qris_check_payment_status');

function qris_check_payment_status() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'qris_payment_nonce')) {
        wp_send_json_error('Invalid nonce');
    }
    
    $order_id = sanitize_text_field($_POST['order_id']);
    
    if (!$order_id) {
        wp_send_json_error('Invalid order ID');
    }
    
    $gateway = new QRIS_Dynamic_Gateway();
    $result = $gateway->check_payment_status($order_id);
    
    wp_send_json($result);
}

// Payment webhook endpoint
add_action('wp_ajax_nopriv_qris_payment_webhook', 'handle_qris_payment_webhook');
add_action('wp_ajax_qris_payment_webhook', 'handle_qris_payment_webhook');

function handle_qris_payment_webhook() {
     // Enhanced debugging - log all headers and request details
    error_log('=== QRIS WEBHOOK DEBUG START ===');
    error_log('Request Method: ' . $_SERVER['REQUEST_METHOD']);
    error_log('Request URI: ' . $_SERVER['REQUEST_URI']);
    error_log('Content Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    
    // Try multiple ways to get headers
    $headers1 = getallheaders();
    $headers2 = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $header_name = str_replace('_', '-', substr($key, 5));
            $headers2[$header_name] = $value;
        }
    }
    
    error_log('Headers method 1 (getallheaders): ' . print_r($headers1, true));
    error_log('Headers method 2 ($_SERVER): ' . print_r($headers2, true));
    
    // Try different header key variations
    $api_key_variations = [
        $headers1['X-API-Key'] ?? '',
        $headers1['x-api-key'] ?? '',
        $headers2['X-API-KEY'] ?? '',
        $headers2['x-api-key'] ?? '',
        $_SERVER['HTTP_X_API_KEY'] ?? '',
        $_SERVER['HTTP_X_API_KEY'] ?? ''
    ];
    
    error_log('API Key variations found: ' . print_r($api_key_variations, true));
    
    // Use the first non-empty API key found
    $api_key = '';
    foreach ($api_key_variations as $key) {
        if (!empty($key)) {
            $api_key = $key;
            break;
        }
    }
    
    $expected_key = get_option('qris_dynamic_api_key');
    
    // Enhanced debugging
    error_log('QRIS Webhook Debug: Final API key used: ' . substr($api_key, 0, 10) . '...');
    error_log('QRIS Webhook Debug: Expected API key: ' . substr($expected_key, 0, 10) . '...');
    error_log('QRIS Webhook Debug: API key lengths - received: ' . strlen($api_key) . ', expected: ' . strlen($expected_key));
    error_log('QRIS Webhook Debug: Keys match: ' . ($api_key === $expected_key ? 'YES' : 'NO'));
    error_log('QRIS Webhook Debug: Key comparison - received hash: ' . md5($api_key) . ', expected hash: ' . md5($expected_key));
    
    if (empty($expected_key)) {
        error_log('QRIS Webhook Error: Expected API key is empty - plugin not configured');
        status_header(401);
        wp_die('Unauthorized - API key not configured', 'Unauthorized', array('response' => 401));
    }
    
    if (empty($api_key)) {
        error_log('QRIS Webhook Error: No API key received in request');
        status_header(401);
        wp_die('Unauthorized - No API key provided', 'Unauthorized', array('response' => 401));
    }
    
    if ($api_key !== $expected_key) {
        error_log('QRIS Webhook Error: API key mismatch');
        status_header(401);
        wp_die('Unauthorized - API key mismatch', 'Unauthorized', array('response' => 401));
    }
    
    error_log('QRIS Webhook: API key validation passed!');
    
    // Get payload
    $raw_payload = file_get_contents('php://input');
    error_log('Raw payload received: ' . $raw_payload);
    
    $payload = json_decode($raw_payload, true);
    error_log('Parsed payload: ' . print_r($payload, true));
    
    if (!$payload || !isset($payload['order_reference']) || !isset($payload['amount'])) {
        error_log('QRIS Webhook Error: Invalid payload structure');
        status_header(400);
        wp_die('Invalid payload', 'Bad Request', array('response' => 400));
    }
    
    // Process payment confirmation
    if (isset($payload['status']) && $payload['status'] === 'completed') {
        $order_id = str_replace('ORDER-', '', $payload['order_reference']);
        $order = wc_get_order($order_id);
        
        if ($order && in_array($order->get_status(), array('pending', 'on-hold', 'processing'))) {
            $order->payment_complete();
            
            // Explicitly set order status to completed for digital/virtual products
            // or if you want all QRIS payments to be auto-completed
            $order->update_status('completed', sprintf(
                __('Payment confirmed via QRIS notification. Amount: Rp %s. Reference: %s', 'qris-dynamic-gateway'),
                number_format($payload['amount']),
                $payload['order_reference']
            ));
            
            // Log successful payment
            error_log(sprintf(
                'QRIS Payment confirmed: Order %s, Amount %s, Status: %s',
                $order_id,
                $payload['amount'],
                $order->get_status()
            ));
        }
    }
    
    status_header(200);
    wp_die('OK', 'OK', array('response' => 200));
}

// Add settings link to plugin actions
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'qris_dynamic_plugin_action_links');

function qris_dynamic_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=wc-settings&tab=checkout&section=qris_dynamic') . '">' . __('Settings', 'qris-dynamic-gateway') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}

// Plugin activation hook
register_activation_hook(__FILE__, 'qris_dynamic_plugin_activate');

function qris_dynamic_plugin_activate() {
    // Check WooCommerce dependency
    if (!class_exists('WooCommerce')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(__('QRIS Dynamic Payment Gateway requires WooCommerce to be installed and active.', 'qris-dynamic-gateway'));
    }
}

// Load textdomain for translations
add_action('plugins_loaded', 'qris_dynamic_load_textdomain');

function qris_dynamic_load_textdomain() {
    load_plugin_textdomain('qris-dynamic-gateway', false, dirname(plugin_basename(__FILE__)) . '/languages');
}