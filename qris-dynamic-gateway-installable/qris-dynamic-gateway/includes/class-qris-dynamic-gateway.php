<?php
/**
 * QRIS Dynamic Payment Gateway Class
 * 
 * Handles WooCommerce payment processing with dynamic QRIS generation
 * and automatic payment confirmation via Android notifications.
 */

if (!defined('ABSPATH')) {
    exit;
}

class QRIS_Dynamic_Gateway extends WC_Payment_Gateway {
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->id = 'qris_dynamic';
        $this->icon = QRIS_PLUGIN_URL . 'assets/qris-icon.png';
        $this->has_fields = false;
        $this->method_title = __('QRIS Dynamic Payment', 'qris-dynamic-gateway');
        $this->method_description = __('Accept payments via dynamic QRIS with automatic notification confirmation', 'qris-dynamic-gateway');
        
        // Supported features
        $this->supports = array(
            'products',
            'refunds'
        );
        
        // Initialize settings
        $this->init_form_fields();
        $this->init_settings();
        
        // Get settings
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->enabled = $this->get_option('enabled');
        $this->backend_url = $this->get_option('backend_url');
        $this->api_key = $this->get_option('api_key');
        $this->static_qris = $this->get_option('static_qris');
        $this->merchant_name = $this->get_option('merchant_name');
        $this->payment_timeout = $this->get_option('payment_timeout', '15');
        $this->auto_check_interval = $this->get_option('auto_check_interval', '30');
        
        // Store API key in options for webhook access
        update_option('qris_dynamic_api_key', $this->api_key);
        
        // Hooks
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('wp_enqueue_scripts', array($this, 'payment_scripts'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
        add_action('woocommerce_receipt_' . $this->id, array($this, 'receipt_page'));
    }
    
    /**
     * Initialize form fields for admin settings
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title' => __('Enable/Disable', 'qris-dynamic-gateway'),
                'type' => 'checkbox',
                'label' => __('Enable QRIS Dynamic Payment', 'qris-dynamic-gateway'),
                'default' => 'no'
            ),
            'title' => array(
                'title' => __('Title', 'qris-dynamic-gateway'),
                'type' => 'text',
                'description' => __('Payment method title that customers will see on checkout.', 'qris-dynamic-gateway'),
                'default' => __('QRIS Payment', 'qris-dynamic-gateway'),
                'desc_tip' => true,
            ),
            'description' => array(
                'title' => __('Description', 'qris-dynamic-gateway'),
                'type' => 'textarea',
                'description' => __('Payment method description that customers will see on checkout.', 'qris-dynamic-gateway'),
                'default' => __('Pay using QRIS. Scan the QR code with your mobile banking app.', 'qris-dynamic-gateway'),
                'desc_tip' => true,
            ),
            'backend_url' => array(
                'title' => __('Backend URL', 'qris-dynamic-gateway'),
                'type' => 'url',
                'description' => __('URL to your NotificationListener backend server (without trailing slash).', 'qris-dynamic-gateway'),
                'desc_tip' => true,
                'placeholder' => 'https://your-backend.example.com'
            ),
            'api_key' => array(
                'title' => __('API Key', 'qris-dynamic-gateway'),
                'type' => 'password',
                'description' => __('API key for backend authentication.', 'qris-dynamic-gateway'),
                'desc_tip' => true,
            ),
            'static_qris' => array(
                'title' => __('Static QRIS Code', 'qris-dynamic-gateway'),
                'type' => 'textarea',
                'description' => __('Your static QRIS code that will be converted to dynamic for each transaction.', 'qris-dynamic-gateway'),
                'desc_tip' => true,
                'placeholder' => '00020101021126570011ID.DANA.WWW...'
            ),
            'merchant_name' => array(
                'title' => __('Merchant Name', 'qris-dynamic-gateway'),
                'type' => 'text',
                'description' => __('Your business name for payment reference.', 'qris-dynamic-gateway'),
                'desc_tip' => true,
            ),
            'payment_timeout' => array(
                'title' => __('Payment Timeout (minutes)', 'qris-dynamic-gateway'),
                'type' => 'number',
                'description' => __('How long to wait for payment confirmation before timing out.', 'qris-dynamic-gateway'),
                'default' => '15',
                'desc_tip' => true,
                'custom_attributes' => array(
                    'min' => '5',
                    'max' => '60'
                )
            ),
            'auto_check_interval' => array(
                'title' => __('Auto Check Interval (seconds)', 'qris-dynamic-gateway'),
                'type' => 'number',
                'description' => __('How often to automatically check for payment confirmation.', 'qris-dynamic-gateway'),
                'default' => '30',
                'desc_tip' => true,
                'custom_attributes' => array(
                    'min' => '10',
                    'max' => '120'
                )
            ),
        );
    }
    
    /**
     * Check if gateway is available
     */
    public function is_available() {
        if ($this->enabled !== 'yes') {
            return false;
        }
        
        // Check required settings
        if (empty($this->backend_url) || empty($this->api_key) || empty($this->static_qris)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Process payment
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return array(
                'result' => 'failure',
                'messages' => __('Invalid order.', 'qris-dynamic-gateway')
            );
        }
        
        try {
            $amount = $order->get_total();
            
            // Generate unique order reference
            $order_reference = 'ORDER-' . $order_id . '-' . time();
            
            // Convert static QRIS to dynamic with unique amount
            $qris_data = $this->convert_to_dynamic_qris($amount, $order_reference);
            
            if (!$qris_data || !isset($qris_data['dynamicQRIS'])) {
                throw new Exception(__('Failed to generate dynamic QRIS. Please try again.', 'qris-dynamic-gateway'));
            }
            
            $dynamic_qris = $qris_data['dynamicQRIS'];
            $combined_amount = $qris_data['amount'] ?? $amount;
            $unique_amount = $qris_data['unique_amount'] ?? null;
            $original_amount = $qris_data['original_amount'] ?? $amount;  // Fallback to original order total
            
            // Register payment expectation with backend using the original order amount
            $registration_result = $this->register_payment_expectation($order_reference, $amount);
            
            if (!$registration_result) {
                throw new Exception(__('Failed to register payment expectation. Please try again.', 'qris-dynamic-gateway'));
            }
            
            // Store QRIS and amount information in order meta
            $order->update_meta_data('_qris_code', $dynamic_qris);
            $order->update_meta_data('_qris_reference', $order_reference);
            $order->update_meta_data('_qris_amount', $amount); // Original order amount
            $order->update_meta_data('_qris_combined_amount', $combined_amount); // Amount to pay
            $order->update_meta_data('_qris_unique_amount', $unique_amount); // Unique identifier
            $order->update_meta_data('_qris_original_amount', $original_amount); // Original amount
            $order->update_meta_data('_qris_timeout', time() + ($this->payment_timeout * 60));
            $order->save();
            
            // Update order status
            $order->update_status('pending', sprintf(
                __('Awaiting QRIS payment. Reference: %s', 'qris-dynamic-gateway'),
                $order_reference
            ));
            
            // Reduce stock
            wc_reduce_stock_levels($order_id);
            
            // Remove cart
            WC()->cart->empty_cart();
            
            // Return success
            return array(
                'result' => 'success',
                'redirect' => $this->get_return_url($order)
            );
            
        } catch (Exception $e) {
            wc_add_notice($e->getMessage(), 'error');
            return array(
                'result' => 'failure'
            );
        }
    }
    
    /**
     * Convert static QRIS to dynamic with unique amount
     */
    private function convert_to_dynamic_qris($amount, $order_reference) {
        $amount_clean = number_format($amount, 0, '', '');
        
        $response = wp_remote_post($this->backend_url . '/qris/convert', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key
            ),
            'body' => json_encode(array(
                'staticQRIS' => $this->static_qris,
                'amount' => $amount_clean,
                'orderRef' => $order_reference
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            error_log('QRIS conversion error: ' . $response->get_error_message());
            return false;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            error_log('QRIS conversion HTTP error: ' . $response_code);
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            error_log('QRIS conversion API error: ' . ($data['error'] ?? 'Unknown error'));
            return false;
        }
        
        return $data; // Return full data including amounts
    }
    
    /**
     * Register payment expectation with backend
     */
    private function register_payment_expectation($order_reference, $amount) {
        $callback_url = admin_url('admin-ajax.php?action=qris_payment_webhook');
        $amount_clean = number_format($amount, 0, '', '');
        
        $response = wp_remote_post($this->backend_url . '/woocommerce/payment-webhook', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key
            ),
            'body' => json_encode(array(
                'orderRef' => $order_reference,
                'expectedAmount' => $amount_clean,
                'callbackUrl' => $callback_url
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            error_log('Payment expectation registration error: ' . $response->get_error_message());
            return false;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            error_log('Payment expectation HTTP error: ' . $response_code);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check payment status
     */
    public function check_payment_status($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return array(
                'success' => false,
                'message' => __('Invalid order.', 'qris-dynamic-gateway')
            );
        }
        
        // Check if order is already paid
        if ($order->is_paid()) {
            return array(
                'success' => true,
                'status' => 'completed',
                'message' => __('Payment already confirmed!', 'qris-dynamic-gateway')
            );
        }
        
        $order_reference = $order->get_meta('_qris_reference');
        $timeout = $order->get_meta('_qris_timeout');
        
        // Check timeout
        if ($timeout && time() > $timeout) {
            $order->update_status('cancelled', __('Payment timeout exceeded.', 'qris-dynamic-gateway'));
            return array(
                'success' => true,
                'status' => 'timeout',
                'message' => __('Payment timeout. Please create a new order.', 'qris-dynamic-gateway')
            );
        }
        
        $response = wp_remote_get($this->backend_url . '/woocommerce/payment-status/' . $order_reference, array(
            'headers' => array(
                'X-API-Key' => $this->api_key
            ),
            'timeout' => 10
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => __('Connection error. Please try again.', 'qris-dynamic-gateway')
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && isset($data['success']) && $data['success'] && $data['payment_found']) {
            // Payment found, complete the order
            $order->payment_complete();
            $order->add_order_note(__('Payment confirmed via notification check.', 'qris-dynamic-gateway'));
            
            return array(
                'success' => true,
                'status' => 'completed',
                'message' => __('Payment confirmed!', 'qris-dynamic-gateway')
            );
        }
        
        return array(
            'success' => true,
            'status' => 'pending',
            'message' => __('Payment not yet confirmed. Please complete payment.', 'qris-dynamic-gateway')
        );
    }
    
    /**
     * Enqueue payment scripts
     */
    public function payment_scripts() {
        if (!is_admin() && (is_checkout() || is_order_received_page())) {
            wp_enqueue_script('qris-payment', QRIS_PLUGIN_URL . 'assets/qris-payment.js', array('jquery'), QRIS_PLUGIN_VERSION, true);
            
            wp_localize_script('qris-payment', 'qris_ajax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('qris_payment_nonce'),
                'check_interval' => $this->auto_check_interval * 1000, // Convert to milliseconds
                'timeout_minutes' => $this->payment_timeout,
                'messages' => array(
                    'checking' => __('Checking payment status...', 'qris-dynamic-gateway'),
                    'completed' => __('Payment confirmed! Redirecting...', 'qris-dynamic-gateway'),
                    'timeout' => __('Payment timeout. Please create a new order.', 'qris-dynamic-gateway'),
                    'error' => __('Error checking payment status.', 'qris-dynamic-gateway')
                )
            ));
        }
    }
    
    /**
     * Receipt page
     */
    public function receipt_page($order_id) {
        $this->thankyou_page($order_id);
    }
    
    /**
     * Thank you page
     */
    public function thankyou_page($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order || $order->get_payment_method() !== $this->id) {
            return;
        }
        
        $qris_code = $order->get_meta('_qris_code');
        $order_reference = $order->get_meta('_qris_reference');
        $amount = $order->get_meta('_qris_amount'); // Original order amount
        $combined_amount = $order->get_meta('_qris_combined_amount'); // Amount to pay
        $unique_amount = $order->get_meta('_qris_unique_amount'); // Unique identifier
        $original_amount = $order->get_meta('_qris_original_amount'); // Original amount
        
        // Use combined amount if available, fallback to original amount
        $payment_amount = $combined_amount ?: $amount;
        
        if ($qris_code && !$order->is_paid()) {
            include QRIS_PLUGIN_PATH . 'includes/payment-instructions.php';
        }
    }
}