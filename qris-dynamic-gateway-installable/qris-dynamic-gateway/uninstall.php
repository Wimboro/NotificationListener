<?php
/**
 * Uninstall script for QRIS Dynamic Payment Gateway
 */

// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete plugin options
delete_option('qris_dynamic_api_key');

// Delete any transients
delete_transient('qris_payment_status');

// Clean up any custom database tables if needed
global $wpdb;

// Remove any custom user meta
$wpdb->delete(
    $wpdb->usermeta,
    array('meta_key' => 'qris_user_preference')
);

// Clear any cached data
wp_cache_flush();