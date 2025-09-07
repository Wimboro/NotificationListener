=== QRIS Dynamic Payment Gateway ===
Contributors: wimboro
Tags: woocommerce, payment, qris, indonesia, mobile-payment
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WooCommerce payment gateway using dynamic QRIS with Android notification confirmation for automatic payment processing.

== Description ==

QRIS Dynamic Payment Gateway is a comprehensive payment solution for WooCommerce that enables automatic payment confirmation through Android notification monitoring.

**Key Features:**

* **Dynamic QRIS Generation**: Converts static QRIS codes to dynamic ones with exact payment amounts
* **Automatic Payment Confirmation**: Uses Android notifications to automatically confirm payments  
* **Real-time Status Updates**: AJAX-based payment status monitoring
* **Secure Integration**: API key authentication and proper validation
* **Order Reference Matching**: Links payments to specific orders using unique references
* **Mobile Optimized**: Responsive QR code display and copy functionality

**How it works:**

1. Customer places order and selects QRIS payment
2. System generates dynamic QRIS with exact amount
3. Customer scans QR code and pays via mobile banking
4. Android device captures payment notification
5. Backend automatically matches payment and completes order

**Requirements:**

* WooCommerce 3.0 or higher
* NotificationListener backend server
* Android device with NotificationListener app

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/qris-dynamic-gateway/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to WooCommerce > Settings > Payments
4. Enable "QRIS Dynamic Payment" and configure settings
5. Set up your backend server and API key

== Configuration ==

1. **Backend URL**: Your NotificationListener backend server URL
2. **API Key**: Authentication key for backend communication
3. **Static QRIS Code**: Your merchant's static QRIS code
4. **Merchant Name**: Your business name for payments
5. **Payment Timeout**: Time limit for payment completion
6. **Auto Check Interval**: Frequency of payment status checks

== Frequently Asked Questions ==

= Do I need a backend server? =

Yes, this plugin requires a NotificationListener backend server to process payment notifications from Android devices.

= Which banking apps are supported? =

All Indonesian banking and e-wallet apps that send QRIS payment notifications, including DANA, OVO, GoPay, BCA, Mandiri, BNI, BRI, and others.

= Is this secure? =

Yes, the plugin uses API key authentication, input validation, and follows WordPress security best practices.

== Screenshots ==

1. Plugin settings page in WooCommerce
2. Payment checkout page with QR code
3. Real-time payment status monitoring

== Changelog ==

= 1.0.0 =
* Initial release
* Dynamic QRIS generation
* Automatic payment confirmation
* Real-time status updates
* Secure API integration

== Upgrade Notice ==

= 1.0.0 =
Initial release of QRIS Dynamic Payment Gateway.