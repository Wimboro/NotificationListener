/**
 * QRIS Payment JavaScript
 * 
 * Handles automatic payment status checking and UI updates
 */

(function($) {
    'use strict';
    
    var qrisPayment = {
        orderId: null,
        checkInterval: null,
        timeoutId: null,
        isChecking: false,
        
        init: function() {
            this.bindEvents();
        },
        
        bindEvents: function() {
            $('#manual-check-payment').on('click', $.proxy(this.manualCheck, this));
        },
        
        setOrderId: function(orderId) {
            this.orderId = orderId;
        },
        
        startAutoCheck: function() {
            if (!this.orderId || !qris_ajax.check_interval) {
                return;
            }
            
            // Start automatic checking
            this.checkInterval = setInterval($.proxy(this.checkPaymentStatus, this), qris_ajax.check_interval);
            
            // Set timeout
            var timeoutMs = qris_ajax.timeout_minutes * 60 * 1000;
            this.timeoutId = setTimeout($.proxy(this.handleTimeout, this), timeoutMs);
            
            // Initial check
            this.checkPaymentStatus();
        },
        
        stopAutoCheck: function() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        },
        
        manualCheck: function() {
            if (this.isChecking) {
                return;
            }
            
            this.checkPaymentStatus();
        },
        
        checkPaymentStatus: function() {
            if (!this.orderId || this.isChecking) {
                return;
            }
            
            this.isChecking = true;
            this.updateStatus('checking', qris_ajax.messages.checking);
            
            $.ajax({
                url: qris_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'qris_check_payment',
                    order_id: this.orderId,
                    nonce: qris_ajax.nonce
                },
                timeout: 10000,
                success: $.proxy(this.handleCheckResponse, this),
                error: $.proxy(this.handleCheckError, this),
                complete: $.proxy(function() {
                    this.isChecking = false;
                }, this)
            });
        },
        
        handleCheckResponse: function(response) {
            if (!response || !response.success) {
                this.handleCheckError();
                return;
            }
            
            switch (response.status) {
                case 'completed':
                    this.handlePaymentCompleted(response.message);
                    break;
                    
                case 'timeout':
                    this.handleTimeout(response.message);
                    break;
                    
                case 'pending':
                default:
                    this.updateStatus('pending', response.message || qris_ajax.messages.pending);
                    break;
            }
        },
        
        handleCheckError: function() {
            this.updateStatus('error', qris_ajax.messages.error);
        },
        
        handlePaymentCompleted: function(message) {
            this.stopAutoCheck();
            this.updateStatus('completed', message || qris_ajax.messages.completed);
            
            // Redirect after a short delay
            setTimeout(function() {
                window.location.reload();
            }, 3000);
        },
        
        handleTimeout: function(message) {
            this.stopAutoCheck();
            this.updateStatus('timeout', message || qris_ajax.messages.timeout);
        },
        
        updateStatus: function(status, message) {
            // Hide all status divs
            $('.status-pending, .status-completed, .status-timeout, .status-error').hide();
            
            // Update message
            $('#status-message').text(message);
            
            // Show appropriate status
            switch (status) {
                case 'checking':
                    $('#payment-status-pending').show();
                    $('#manual-check-payment').prop('disabled', true).text('Checking...');
                    break;
                    
                case 'pending':
                    $('#payment-status-pending').show();
                    $('#manual-check-payment').prop('disabled', false).text('Check Payment Status');
                    break;
                    
                case 'completed':
                    $('#payment-status-completed').show();
                    $('#manual-check-payment').prop('disabled', true);
                    break;
                    
                case 'timeout':
                    $('#payment-status-timeout').show();
                    $('#manual-check-payment').prop('disabled', true);
                    break;
                    
                case 'error':
                    $('#payment-status-error').show();
                    $('#manual-check-payment').prop('disabled', false).text('Retry Check');
                    break;
            }
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        qrisPayment.init();
    });
    
    // Expose to global scope
    window.qris_payment = qrisPayment;
    
})(jQuery);