<?php
/**
 * Payment Instructions Template
 * 
 * Displays QRIS code and payment instructions to customers
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div id="qris-payment-instructions" class="qris-payment-container" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3><?php _e('Complete Your Payment', 'qris-dynamic-gateway'); ?></h3>
    
    <div class="qris-payment-info" style="margin-bottom: 20px;">
        <p><strong><?php _e('Order Reference:', 'qris-dynamic-gateway'); ?></strong> <code><?php echo esc_html($order_reference); ?></code></p>
        <p><strong><?php _e('Order Amount:', 'qris-dynamic-gateway'); ?></strong> <?php echo wc_price($amount); ?></p>
        <?php if (isset($combined_amount) && $combined_amount != $amount): ?>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <p style="margin: 0;"><strong><?php _e('⚠️ IMPORTANT: Pay This Exact Amount:', 'qris-dynamic-gateway'); ?></strong></p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;"><?php echo wc_price($payment_amount); ?></p>
                <?php if (isset($unique_amount)): ?>
                    <p style="margin: 5px 0 0 0; font-size: 12px;">
                        <?php printf(__('This includes a unique identifier (+%s) for automatic confirmation.', 'qris-dynamic-gateway'), wc_price($unique_amount)); ?>
                    </p>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <p><strong><?php _e('Amount to Pay:', 'qris-dynamic-gateway'); ?></strong> <?php echo wc_price($payment_amount); ?></p>
        <?php endif; ?>
    </div>
    
    <div class="qris-code-section" style="text-align: center; margin: 20px 0;">
        <h4><?php _e('Scan QR Code to Pay', 'qris-dynamic-gateway'); ?></h4>
        <div id="qris-code-container" style="margin: 20px auto; max-width: 300px;">
            <div id="qris-qrcode"></div>
        </div>
        <p class="qris-code-text" style="display: none; font-size: 12px; word-break: break-all; padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;">
            <?php echo esc_html($qris_code); ?>
        </p>
        <button type="button" id="copy-qris-code" class="button" style="display: none; margin-top: 10px;">
            <?php _e('Copy QRIS Code', 'qris-dynamic-gateway'); ?>
        </button>
    </div>
    
    <div class="payment-instructions" style="margin: 20px 0;">
        <h4><?php _e('Payment Instructions:', 'qris-dynamic-gateway'); ?></h4>
        <ol style="padding-left: 20px;">
            <li><?php _e('Open your mobile banking app or e-wallet', 'qris-dynamic-gateway'); ?></li>
            <li><?php _e('Select "Scan QR" or "QRIS Payment" feature', 'qris-dynamic-gateway'); ?></li>
            <li><?php _e('Scan the QR code above', 'qris-dynamic-gateway'); ?></li>
            <li><strong><?php printf(__('Verify the payment amount is exactly %s', 'qris-dynamic-gateway'), wc_price($payment_amount)); ?></strong></li>
            <li><?php _e('Complete the payment', 'qris-dynamic-gateway'); ?></li>
            <li><?php _e('Wait for automatic confirmation (this page will update)', 'qris-dynamic-gateway'); ?></li>
        </ol>
        <?php if (isset($combined_amount) && $combined_amount != $amount): ?>
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <p style="margin: 0; font-weight: bold;"><?php _e('🚨 Important Note:', 'qris-dynamic-gateway'); ?></p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">
                    <?php _e('You must pay the exact amount shown above, not the original order amount. This includes a small unique identifier for automatic payment confirmation.', 'qris-dynamic-gateway'); ?>
                </p>
            </div>
        <?php endif; ?>
    </div>
    
    <div class="payment-status" style="margin: 20px 0; padding: 15px; border-radius: 4px; text-align: center;">
        <div id="payment-status-pending" class="status-pending" style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404;">
            <p><strong><?php _e('⏳ Waiting for Payment...', 'qris-dynamic-gateway'); ?></strong></p>
            <p id="status-message"><?php _e('Please complete the payment using the QR code above.', 'qris-dynamic-gateway'); ?></p>
            <p id="auto-check-info" style="font-size: 14px; color: #666;">
                <?php printf(__('Checking payment status every %d seconds...', 'qris-dynamic-gateway'), $this->auto_check_interval); ?>
            </p>
        </div>
        
        <div id="payment-status-completed" class="status-completed" style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; display: none;">
            <p><strong><?php _e('✅ Payment Confirmed!', 'qris-dynamic-gateway'); ?></strong></p>
            <p><?php _e('Thank you for your payment. Your order is being processed.', 'qris-dynamic-gateway'); ?></p>
        </div>
        
        <div id="payment-status-timeout" class="status-timeout" style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; display: none;">
            <p><strong><?php _e('⏰ Payment Timeout', 'qris-dynamic-gateway'); ?></strong></p>
            <p><?php _e('Payment time has expired. Please create a new order.', 'qris-dynamic-gateway'); ?></p>
        </div>
        
        <div id="payment-status-error" class="status-error" style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; display: none;">
            <p><strong><?php _e('❌ Connection Error', 'qris-dynamic-gateway'); ?></strong></p>
            <p><?php _e('Unable to check payment status. Please refresh the page.', 'qris-dynamic-gateway'); ?></p>
        </div>
    </div>
    
    <div class="manual-check-section" style="text-align: center; margin-top: 20px;">
        <button type="button" id="manual-check-payment" class="button button-primary">
            <?php _e('Check Payment Status', 'qris-dynamic-gateway'); ?>
        </button>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
            <?php printf(__('Payment will timeout in %d minutes', 'qris-dynamic-gateway'), $this->payment_timeout); ?>
        </p>
    </div>
</div>

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Generate QR Code using qrious library (loaded from CDN)
    if (typeof QRious !== 'undefined') {
        var qr = new QRious({
            element: document.createElement('canvas'),
            value: '<?php echo esc_js($qris_code); ?>',
            size: 250,
            level: 'M'
        });
        $('#qris-qrcode').html(qr.canvas);
    } else {
        // Fallback: load QR code library
        $('<script>').attr('src', 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js').appendTo('head').on('load', function() {
            var qr = new QRious({
                element: document.createElement('canvas'),
                value: '<?php echo esc_js($qris_code); ?>',
                size: 250,
                level: 'M'
            });
            $('#qris-qrcode').html(qr.canvas);
        });
    }
    
    // Copy QRIS code functionality
    $('#copy-qris-code').on('click', function() {
        var qrisText = '<?php echo esc_js($qris_code); ?>';
        navigator.clipboard.writeText(qrisText).then(function() {
            var btn = $('#copy-qris-code');
            var originalText = btn.text();
            btn.text('<?php _e('Copied!', 'qris-dynamic-gateway'); ?>');
            setTimeout(function() {
                btn.text(originalText);
            }, 2000);
        });
    });
    
    // Set order ID for payment checking
    if (typeof qris_payment !== 'undefined') {
        qris_payment.setOrderId(<?php echo intval($order_id); ?>);
        qris_payment.startAutoCheck();
    }
});
</script>

<!-- Load QR Code library -->
<script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>