/**
 * QRIS Payment Integration Module
 * 
 * This module extends the existing NotificationListener backend with QRIS payment functionality.
 * It provides endpoints for QRIS conversion and WooCommerce integration.
 */

const QRISConverter = require('./qris-converter');

/**
 * Setup QRIS routes for the existing Express app
 * @param {Express} app - Express application instance
 * @param {Function} validateApiKey - API key validation middleware
 * @param {sqlite3.Database} db - SQLite database instance
 */
function setupQRISRoutes(app, validateApiKey, db) {
    
    // QRIS conversion endpoint
    app.post('/qris/convert', validateApiKey, (req, res) => {
        try {
            const { staticQRIS, amount, serviceFee } = req.body;
            
            // Validate required fields
            if (!staticQRIS || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: staticQRIS, amount'
                });
            }
            
            // Validate QRIS format
            if (!QRISConverter.validateQRIS(staticQRIS)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid QRIS format'
                });
            }
            
            // Convert to dynamic QRIS
            const dynamicQRIS = QRISConverter.convertStaticToDynamic(
                staticQRIS, 
                amount, 
                serviceFee
            );
            
            // Log conversion for audit
            console.log(`QRIS conversion: amount ${amount}, length: ${dynamicQRIS.length}`);
            
            res.json({
                success: true,
                staticQRIS,
                dynamicQRIS,
                amount,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('QRIS conversion error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // QRIS validation endpoint
    app.post('/qris/validate', validateApiKey, (req, res) => {
        try {
            const { qris } = req.body;
            
            if (!qris) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing QRIS code'
                });
            }
            
            const isValid = QRISConverter.validateQRIS(qris);
            const extractedAmount = QRISConverter.extractAmount(qris);
            
            res.json({
                success: true,
                valid: isValid,
                type: qris.includes('010212') ? 'dynamic' : 'static',
                amount: extractedAmount,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('QRIS validation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // WooCommerce payment status endpoint
    app.get('/woocommerce/payment-status/:orderRef', validateApiKey, (req, res) => {
        const orderRef = req.params.orderRef;
        const timeoutMinutes = req.query.timeout || 15; // 15 minutes default
        const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
        
        // Search for payment notifications matching the order reference
        db.get(`
            SELECT * FROM notifications 
            WHERE (text LIKE ? OR title LIKE ? OR big_text LIKE ?) 
            AND amount_detected IS NOT NULL
            AND created_at > ?
            ORDER BY created_at DESC LIMIT 1
        `, [
            `%${orderRef}%`, 
            `%${orderRef}%`, 
            `%${orderRef}%`,
            timeoutDate
        ], (err, row) => {
            if (err) {
                console.error('Database error in payment status check:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }
            
            res.json({
                success: true,
                payment_found: !!row,
                amount: row?.amount_detected,
                notification_text: row?.text,
                timestamp: row?.created_at,
                order_reference: orderRef
            });
        });
    });
    
    // WooCommerce webhook for payment expectations
    app.post('/woocommerce/payment-webhook', validateApiKey, (req, res) => {
        try {
            const { orderRef, expectedAmount, callbackUrl } = req.body;
            
            if (!orderRef || !expectedAmount) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: orderRef, expectedAmount'
                });
            }
            
            // Store payment expectation
            db.run(`
                INSERT OR REPLACE INTO payment_expectations (
                    order_reference, expected_amount, callback_url, created_at, status
                ) VALUES (?, ?, ?, ?, 'pending')
            `, [orderRef, expectedAmount, callbackUrl, new Date().toISOString()], function(err) {
                if (err) {
                    console.error('Database error storing payment expectation:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }
                
                console.log(`Payment expectation registered: ${orderRef} - ${expectedAmount}`);
                
                res.json({
                    success: true,
                    message: 'Payment expectation registered',
                    order_reference: orderRef,
                    id: this.lastID
                });
            });
            
        } catch (error) {
            console.error('Payment webhook error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    
    // Get payment expectations (for debugging)
    app.get('/woocommerce/payment-expectations', validateApiKey, (req, res) => {
        const { status = 'pending', limit = 50 } = req.query;
        
        db.all(`
            SELECT * FROM payment_expectations 
            WHERE status = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [status, parseInt(limit)], (err, rows) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }
            
            res.json({
                success: true,
                data: rows,
                count: rows.length
            });
        });
    });
}

/**
 * Enhanced notification processing for payment matching
 * @param {sqlite3.Database} db - SQLite database instance
 * @param {string} text - Notification text
 * @param {string} title - Notification title
 * @param {string} bigText - Notification big text
 * @param {string} amountDetected - Detected amount
 */
function checkPaymentMatch(db, text, title, bigText, amountDetected) {
    const searchText = `${text || ''} ${title || ''} ${bigText || ''}`.toLowerCase();
    
    // Find pending payment expectations that match the amount
    db.all(`
        SELECT * FROM payment_expectations 
        WHERE status = 'pending' 
        AND expected_amount = ?
        AND created_at > datetime('now', '-30 minutes')
    `, [amountDetected], (err, expectations) => {
        if (err || !expectations.length) {
            return;
        }
        
        expectations.forEach(expectation => {
            // Check if order reference appears in notification text
            const orderRefLower = expectation.order_reference.toLowerCase();
            
            if (searchText.includes(orderRefLower)) {
                // Mark payment as completed
                db.run(`
                    UPDATE payment_expectations 
                    SET status = 'completed', completed_at = ? 
                    WHERE id = ?
                `, [new Date().toISOString(), expectation.id], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating payment expectation:', updateErr);
                        return;
                    }
                    
                    console.log(`✅ Payment matched! Order: ${expectation.order_reference}, Amount: ${amountDetected}`);
                    
                    // Notify WooCommerce if callback URL is provided
                    if (expectation.callback_url) {
                        notifyWooCommerce(expectation.callback_url, {
                            order_reference: expectation.order_reference,
                            amount: amountDetected,
                            status: 'completed',
                            notification_text: text,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
        });
    });
}

/**
 * Notify WooCommerce about payment completion
 * @param {string} callbackUrl - WooCommerce webhook URL
 * @param {Object} paymentData - Payment information
 */
async function notifyWooCommerce(callbackUrl, paymentData) {
    try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const parsedUrl = url.parse(callbackUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const postData = JSON.stringify(paymentData);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-Source': 'NotificationListener-QRIS'
            }
        };
        
        const req = client.request(options, (res) => {
            console.log(`WooCommerce notification sent: ${res.statusCode}`);
        });
        
        req.on('error', (error) => {
            console.error('Failed to notify WooCommerce:', error.message);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        console.error('WooCommerce notification error:', error);
    }
}

/**
 * Setup payment expectations database table
 * @param {sqlite3.Database} db - SQLite database instance
 */
function setupPaymentExpectationsTable(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS payment_expectations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_reference TEXT UNIQUE NOT NULL,
            expected_amount TEXT NOT NULL,
            callback_url TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('Error creating payment_expectations table:', err);
        } else {
            console.log('✅ Payment expectations table ready');
        }
    });
}

module.exports = {
    setupQRISRoutes,
    checkPaymentMatch,
    setupPaymentExpectationsTable
};