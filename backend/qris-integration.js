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
    
    // QRIS conversion endpoint with unique amount generation
    app.post('/qris/convert', validateApiKey, async (req, res) => {
        try {
            const { staticQRIS, amount, serviceFee, orderRef } = req.body;
            
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
            
            let uniqueAmount = amount;
            let useUniqueAmount = false;
            
            // If orderRef provided, generate unique 3-digit amount
            if (orderRef) {
                try {
                    uniqueAmount = await generateUniqueAmount(db, orderRef);
                    useUniqueAmount = true;
                    console.log(`🎲 Using unique amount ${uniqueAmount} for order ${orderRef} (original: ${amount})`);
                } catch (uniqueErr) {
                    console.error('Failed to generate unique amount:', uniqueErr);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to generate unique amount: ' + uniqueErr.message
                    });
                }
            }
            
            // Convert to dynamic QRIS using combined amount (original + unique)
            const combinedAmount = useUniqueAmount ? (parseInt(amount) + parseInt(uniqueAmount)).toString() : amount;
            const dynamicQRIS = QRISConverter.convertStaticToDynamic(
                staticQRIS, 
                combinedAmount, 
                serviceFee
            );
            
            // Log conversion for audit
            console.log(`QRIS conversion: original amount ${amount}, unique amount ${uniqueAmount}, combined amount ${combinedAmount}, length: ${dynamicQRIS.length}`);
            
            const response = {
                success: true,
                staticQRIS,
                dynamicQRIS,
                amount: combinedAmount,
                timestamp: new Date().toISOString()
            };
            
            // Include additional info if unique amount was used
            if (useUniqueAmount) {
                response.original_amount = amount;
                response.unique_amount = uniqueAmount;
                response.combined_amount = combinedAmount;
                response.order_reference = orderRef;
                response.amount_type = 'combined';
            }
            
            res.json(response);
            
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
        
        // First, check if there's a payment expectation for this order
        db.get(`
            SELECT * FROM payment_expectations 
            WHERE order_reference = ? 
            AND created_at > ?
            ORDER BY created_at DESC LIMIT 1
        `, [orderRef, timeoutDate], (err, expectation) => {
            if (err) {
                console.error('Database error checking payment expectation:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }
            
            if (!expectation) {
                return res.json({
                    success: true,
                    payment_found: false,
                    error: 'No payment expectation found for this order',
                    order_reference: orderRef
                });
            }
            
            // If payment expectation already completed, return success
            if (expectation.status === 'completed') {
                return res.json({
                    success: true,
                    payment_found: true,
                    amount: expectation.expected_amount,
                    status: 'completed',
                    completed_at: expectation.completed_at,
                    order_reference: orderRef
                });
            }
            
            // Search for payment notifications matching both order reference AND expected amount (with normalization)
            const normalizedExpectedAmount = parseInt(expectation.expected_amount || expectation.unique_amount, 10).toString();
            
            db.get(`
                SELECT * FROM notifications 
                WHERE (text LIKE ? OR title LIKE ? OR big_text LIKE ?) 
                AND (amount_detected = ? OR CAST(amount_detected AS INTEGER) = ?)
                AND created_at > ?
                ORDER BY created_at DESC LIMIT 1
            `, [
                `%${orderRef}%`, 
                `%${orderRef}%`, 
                `%${orderRef}%`,
                expectation.expected_amount || expectation.unique_amount,
                normalizedExpectedAmount,
                timeoutDate
            ], (err, notification) => {
                if (err) {
                    console.error('Database error in payment status check:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Database error' 
                    });
                }
                
                if (notification) {
                    // Payment found and amount matches! Mark expectation as completed
                    db.run(`
                        UPDATE payment_expectations 
                        SET status = 'completed', completed_at = ? 
                        WHERE id = ?
                    `, [new Date().toISOString(), expectation.id], (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating payment expectation:', updateErr);
                        } else {
                            console.log(`✅ Payment confirmed via status check! Order: ${orderRef}, Amount: ${expectation.expected_amount}`);
                        }
                    });
                    
                    const normalizedNotificationAmount = parseInt(notification.amount_detected, 10).toString();
                    const normalizedExpectedAmount = parseInt(expectation.expected_amount || expectation.unique_amount, 10).toString();
                    
                    return res.json({
                        success: true,
                        payment_found: true,
                        amount: notification.amount_detected,
                        expected_amount: expectation.expected_amount || expectation.unique_amount,
                        amount_matches: normalizedNotificationAmount === normalizedExpectedAmount,
                        notification_text: notification.text,
                        timestamp: notification.created_at,
                        order_reference: orderRef,
                        status: 'completed'
                    });
                } else {
                    // No matching payment found yet
                    return res.json({
                        success: true,
                        payment_found: false,
                        expected_amount: expectation.expected_amount,
                        order_reference: orderRef,
                        status: 'pending',
                        message: 'Payment not yet detected or amount does not match'
                    });
                }
            });
        });
    });
    
    // WooCommerce webhook for payment expectations with unique amounts
    app.post('/woocommerce/payment-webhook', validateApiKey, async (req, res) => {
        try {
            const { orderRef, expectedAmount, callbackUrl, useUniqueAmount = true } = req.body;
            
            if (!orderRef || !expectedAmount) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: orderRef, expectedAmount'
                });
            }
            
            let uniqueAmount = expectedAmount;
            
            // Generate unique amount if requested
            if (useUniqueAmount) {
                try {
                    uniqueAmount = await generateUniqueAmount(db, orderRef);
                    console.log(`🎲 Generated unique amount ${uniqueAmount} for order ${orderRef} (original: ${expectedAmount})`);
                } catch (uniqueErr) {
                    console.error('Failed to generate unique amount:', uniqueErr);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to generate unique amount: ' + uniqueErr.message
                    });
                }
            }
            
            // Calculate combined amount (original + unique)
            const combinedAmount = useUniqueAmount ? (parseInt(expectedAmount) + parseInt(uniqueAmount)).toString() : expectedAmount;
            
            // Store payment expectation with combined amount as expected_amount
            db.run(`
                INSERT OR REPLACE INTO payment_expectations (
                    order_reference, expected_amount, unique_amount, original_amount, callback_url, created_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `, [orderRef, combinedAmount, uniqueAmount, expectedAmount, callbackUrl, new Date().toISOString()], function(err) {
                if (err) {
                    console.error('Database error storing payment expectation:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }
                
                console.log(`Payment expectation registered: ${orderRef} - Combined: ${combinedAmount}, Unique: ${uniqueAmount}, Original: ${expectedAmount}`);
                
                const response = {
                    success: true,
                    message: 'Payment expectation registered',
                    order_reference: orderRef,
                    expected_amount: combinedAmount,
                    id: this.lastID
                };
                
                if (useUniqueAmount) {
                    response.original_amount = expectedAmount;
                    response.unique_amount = uniqueAmount;
                    response.combined_amount = combinedAmount;
                    response.amount_type = 'combined';
                }
                
                res.json(response);
            });
            
        } catch (error) {
            console.error('Payment webhook error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    
    // Enhanced QRIS generation endpoint for WooCommerce transactions
    app.post('/qris/generate-for-order', validateApiKey, async (req, res) => {
        try {
            const { staticQRIS, originalAmount, orderRef, callbackUrl, serviceFee } = req.body;
            
            if (!staticQRIS || !originalAmount || !orderRef) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: staticQRIS, originalAmount, orderRef'
                });
            }
            
            // Validate QRIS format
            if (!QRISConverter.validateQRIS(staticQRIS)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid QRIS format'
                });
            }
            
            // Generate unique 3-digit amount
            const uniqueAmount = await generateUniqueAmount(db, orderRef);
            
            // Calculate combined amount (original + unique)
            const combinedAmount = (parseInt(originalAmount) + parseInt(uniqueAmount)).toString();
            
            // Convert to dynamic QRIS with combined amount
            const dynamicQRIS = QRISConverter.convertStaticToDynamic(
                staticQRIS, 
                combinedAmount, 
                serviceFee
            );
            
            // Store payment expectation
            db.run(`
                INSERT OR REPLACE INTO payment_expectations (
                    order_reference, expected_amount, unique_amount, original_amount, callback_url, created_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `, [orderRef, combinedAmount, uniqueAmount, originalAmount, callbackUrl, new Date().toISOString()], function(err) {
                if (err) {
                    console.error('Database error storing payment expectation:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }
                
                console.log(`🎲 QRIS generated for order ${orderRef}: combined amount ${combinedAmount} (unique: ${uniqueAmount}, original: ${originalAmount})`);
                
                res.json({
                    success: true,
                    order_reference: orderRef,
                    dynamic_qris: dynamicQRIS,
                    combined_amount: combinedAmount,
                    unique_amount: uniqueAmount,
                    original_amount: originalAmount,
                    amount_for_payment: combinedAmount,
                    payment_expectation_id: this.lastID,
                    instructions: {
                        customer: `Please pay exactly ${combinedAmount} IDR using the QR code`,
                        system: `Monitor notifications for amount ${combinedAmount} to confirm payment`
                    },
                    timestamp: new Date().toISOString()
                });
            });
            
        } catch (error) {
            console.error('QRIS generation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Get unique amount for order (useful for frontend)
    app.get('/qris/unique-amount/:orderRef', validateApiKey, (req, res) => {
        const orderRef = req.params.orderRef;
        
        db.get(`
            SELECT unique_amount, original_amount, status, created_at
            FROM payment_expectations 
            WHERE order_reference = ?
            ORDER BY created_at DESC LIMIT 1
        `, [orderRef], (err, row) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
            res.json({
                success: true,
                order_reference: orderRef,
                unique_amount: row.unique_amount,
                original_amount: row.original_amount,
                status: row.status,
                created_at: row.created_at
            });
        });
    });
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
    
    // Amount confirmation endpoint - checks if detected amount matches expected checkout amount
    app.get('/woocommerce/confirm-amount/:orderRef/:expectedAmount', validateApiKey, (req, res) => {
        const orderRef = req.params.orderRef;
        const expectedAmount = req.params.expectedAmount;
        const timeoutMinutes = req.query.timeout || 15;
        const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
        
        console.log(`🔍 Confirming amount for order: ${orderRef}, expected: ${expectedAmount}`);
        
        // Search for notifications that match both order reference AND exact amount
        db.get(`
            SELECT * FROM notifications 
            WHERE (text LIKE ? OR title LIKE ? OR big_text LIKE ?) 
            AND amount_detected = ?
            AND created_at > ?
            ORDER BY created_at DESC LIMIT 1
        `, [
            `%${orderRef}%`, 
            `%${orderRef}%`, 
            `%${orderRef}%`,
            expectedAmount,
            timeoutDate
        ], (err, notification) => {
            if (err) {
                console.error('Database error in amount confirmation:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }
            
            if (notification) {
                console.log(`✅ Amount confirmed! Order: ${orderRef}, Amount: ${expectedAmount}`);
                
                res.json({
                    success: true,
                    amount_confirmed: true,
                    order_reference: orderRef,
                    expected_amount: expectedAmount,
                    detected_amount: notification.amount_detected,
                    amounts_match: notification.amount_detected === expectedAmount,
                    notification_text: notification.text,
                    notification_time: notification.created_at,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log(`❌ Amount not confirmed. Order: ${orderRef}, Expected: ${expectedAmount}`);
                
                // Also check if there's any notification with different amount for debugging
                db.get(`
                    SELECT amount_detected FROM notifications 
                    WHERE (text LIKE ? OR title LIKE ? OR big_text LIKE ?) 
                    AND amount_detected IS NOT NULL
                    AND created_at > ?
                    ORDER BY created_at DESC LIMIT 1
                `, [
                    `%${orderRef}%`, 
                    `%${orderRef}%`, 
                    `%${orderRef}%`,
                    timeoutDate
                ], (err2, anyNotification) => {
                    res.json({
                        success: true,
                        amount_confirmed: false,
                        order_reference: orderRef,
                        expected_amount: expectedAmount,
                        detected_amount: anyNotification?.amount_detected || null,
                        amounts_match: false,
                        message: anyNotification 
                            ? `Found notification but amount mismatch. Expected: ${expectedAmount}, Found: ${anyNotification.amount_detected}`
                            : 'No notification found for this order',
                        timestamp: new Date().toISOString()
                    });
                });
            }
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
    
    console.log(`🔍 Checking payment match for amount: ${amountDetected}`);
    
    // Normalize the detected amount by removing leading zeros
    const normalizedDetectedAmount = parseInt(amountDetected, 10).toString();
    
    // Find pending payment expectations that match the amount (with normalization)
    // Check for: combined amount (primary), original amount (fallback), or unique amount (legacy)
    db.all(`
        SELECT * FROM payment_expectations 
        WHERE status = 'pending' 
        AND (
            expected_amount = ? OR CAST(expected_amount AS INTEGER) = ? OR
            original_amount = ? OR CAST(original_amount AS INTEGER) = ? OR
            unique_amount = ? OR CAST(unique_amount AS INTEGER) = ?
        )
        AND created_at > datetime('now', '-30 minutes')
    `, [amountDetected, normalizedDetectedAmount, amountDetected, normalizedDetectedAmount, amountDetected, normalizedDetectedAmount], (err, expectations) => {
        if (err) {
            console.error('Error checking payment expectations:', err);
            return;
        }
        
        if (!expectations.length) {
            console.log(`⚠️  No pending expectations found for amount: ${amountDetected}`);
            return;
        }
        
        console.log(`💵 Found ${expectations.length} pending expectation(s) for amount: ${amountDetected}`);
        
        expectations.forEach(expectation => {
            // Check if order reference appears in notification text
            const orderRefLower = expectation.order_reference.toLowerCase();
            
            console.log(`🔍 Checking order reference: ${expectation.order_reference}`);
            console.log(`📝 Search text: ${searchText.substring(0, 100)}...`);
            
            // Try to match by order reference first (preferred method)
            if (searchText.includes(orderRefLower)) {
                console.log(`✅ Order reference found in notification text`);
                markPaymentCompleted(db, expectation, amountDetected, text, 'order_reference_match');
            } else {
                console.log(`❌ Order reference not found in notification text`);
                
                // If no other expectations with this amount exist in last 5 minutes, 
                // assume this is the correct payment (fallback matching)
                db.get(`
                    SELECT COUNT(*) as count FROM payment_expectations 
                    WHERE status = 'pending' 
                    AND (
                        expected_amount = ? OR CAST(expected_amount AS INTEGER) = ? OR
                        original_amount = ? OR CAST(original_amount AS INTEGER) = ? OR
                        unique_amount = ? OR CAST(unique_amount AS INTEGER) = ?
                    )
                    AND created_at > datetime('now', '-5 minutes')
                `, [amountDetected, normalizedDetectedAmount, amountDetected, normalizedDetectedAmount, amountDetected, normalizedDetectedAmount], (countErr, result) => {
                    if (countErr) {
                        console.error('Error counting payment expectations:', countErr);
                        return;
                    }
                    
                    const pendingCount = result.count;
                    console.log(`📊 Found ${pendingCount} pending expectation(s) with amount ${amountDetected} in last 5 minutes`);
                    
                    if (pendingCount === 1) {
                        console.log(`✅ Only one pending expectation found - assuming amount-only match`);
                        markPaymentCompleted(db, expectation, amountDetected, text, 'amount_only_match');
                    } else {
                        console.log(`⚠️  Multiple pending expectations with same amount - skipping to avoid ambiguity`);
                    }
                });
            }
        });
    });
}

/**
 * Helper function to mark payment as completed
 * @param {sqlite3.Database} db - SQLite database instance
 * @param {Object} expectation - Payment expectation object
 * @param {string} amountDetected - Detected amount
 * @param {string} text - Notification text
 * @param {string} matchType - Type of match ('order_reference_match' or 'amount_only_match')
 */
function markPaymentCompleted(db, expectation, amountDetected, text, matchType) {
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
        
        console.log(`✅ Payment matched! Order: ${expectation.order_reference}, Expected: ${expectation.expected_amount}, Detected: ${amountDetected} (Match type: ${matchType})`);
        
        // Determine what amount to compare against based on the detected amount
        let expectedAmountToMatch;
        let matchingField;
        
        // Check which field matches the detected amount (prioritize expected_amount)
        const normalizedExpected = parseInt(expectation.expected_amount, 10).toString();
        const normalizedOriginal = parseInt(expectation.original_amount || '0', 10).toString();
        const normalizedUnique = parseInt(expectation.unique_amount || '0', 10).toString();
        const normalizedDetected = parseInt(amountDetected, 10).toString();
        
        if (normalizedDetected === normalizedExpected) {
            expectedAmountToMatch = expectation.expected_amount;
            matchingField = 'expected_amount (combined)';
        } else if (normalizedDetected === normalizedOriginal) {
            expectedAmountToMatch = expectation.original_amount;
            matchingField = 'original_amount';
        } else if (normalizedDetected === normalizedUnique) {
            expectedAmountToMatch = expectation.unique_amount;
            matchingField = 'unique_amount';
        } else {
            expectedAmountToMatch = expectation.expected_amount;
            matchingField = 'expected_amount (fallback)';
        }
        
        // Check if amounts match after normalization
        const normalizedExpectedToMatch = parseInt(expectedAmountToMatch, 10).toString();
        
        if (normalizedDetected === normalizedExpectedToMatch) {
            console.log(`✅ Amount verification passed: ${normalizedDetected} === ${normalizedExpectedToMatch} (${matchingField}: ${expectedAmountToMatch} vs detected: ${amountDetected})`);
            
            // Notify WooCommerce if callback URL is provided
            if (expectation.callback_url) {
                notifyWooCommerce(expectation.callback_url, {
                    order_reference: expectation.order_reference,
                    amount: amountDetected,
                    expected_amount: expectation.expected_amount,
                    status: 'completed',
                    notification_text: text,
                    match_type: matchType,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            console.error(`❌ Amount mismatch after normalization! Expected: ${normalizedExpectedToMatch} (from ${matchingField}: ${expectedAmountToMatch}), Detected: ${normalizedDetected} (from ${amountDetected})`);
            // Revert the status update
            db.run(`
                UPDATE payment_expectations 
                SET status = 'pending', completed_at = NULL 
                WHERE id = ?
            `, [expectation.id]);
        }
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
                'X-Source': 'NotificationListener-QRIS',
                'X-API-Key': process.env.API_KEY || 'Akusuk4k4mu:'
            },
            // Disable certificate verification for self-signed certificates
            rejectUnauthorized: false
        };
        
        const req = client.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`WooCommerce notification sent: ${res.statusCode}`);
                if (res.statusCode >= 400) {
                    console.error(`WooCommerce notification error response: ${responseData}`);
                } else {
                    console.log(`WooCommerce notification response: ${responseData}`);
                }
            });
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
    // First create the table if it doesn't exist
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
            return;
        }
        
        // Check if new columns exist and add them if not
        db.all("PRAGMA table_info(payment_expectations)", (err, columns) => {
            if (err) {
                console.error('Error checking table structure:', err);
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            
            // Add unique_amount column if it doesn't exist
            if (!columnNames.includes('unique_amount')) {
                db.run(`ALTER TABLE payment_expectations ADD COLUMN unique_amount TEXT`, (err) => {
                    if (err) {
                        console.error('Error adding unique_amount column:', err);
                    } else {
                        console.log('✅ Added unique_amount column to payment_expectations');
                    }
                });
            }
            
            // Add original_amount column if it doesn't exist
            if (!columnNames.includes('original_amount')) {
                db.run(`ALTER TABLE payment_expectations ADD COLUMN original_amount TEXT`, (err) => {
                    if (err) {
                        console.error('Error adding original_amount column:', err);
                    } else {
                        console.log('✅ Added original_amount column to payment_expectations');
                    }
                });
            }
            
            console.log('✅ Payment expectations table ready');
        });
    });
    
    // Create unique amounts tracking table
    db.run(`
        CREATE TABLE IF NOT EXISTS unique_amounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unique_amount TEXT UNIQUE NOT NULL,
            order_reference TEXT,
            status TEXT DEFAULT 'used',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('Error creating unique_amounts table:', err);
        } else {
            console.log('✅ Unique amounts tracking table ready');
        }
    });
}

/**
 * Generate unique 3-digit amount for transaction identification
 * @param {sqlite3.Database} db - SQLite database instance
 * @param {string} orderRef - Order reference
 * @returns {Promise<string>} Unique 3-digit amount
 */
function generateUniqueAmount(db, orderRef) {
    return new Promise((resolve, reject) => {
        // First, check if this order already has a unique amount assigned
        db.get(`
            SELECT unique_amount FROM unique_amounts 
            WHERE order_reference = ? 
            AND expires_at > datetime('now')
            ORDER BY created_at DESC LIMIT 1
        `, [orderRef], (err, existingRow) => {
            if (err) {
                return reject(err);
            }
            
            if (existingRow) {
                // Reuse existing unique amount for this order
                console.log(`♻️  Reusing unique amount: ${existingRow.unique_amount} for order: ${orderRef}`);
                return resolve(existingRow.unique_amount);
            }
            
            // No existing unique amount, generate a new one
            // Clean up expired amounts (older than 1 hour)
            db.run(`
                DELETE FROM unique_amounts 
                WHERE expires_at < datetime('now')
            `);
            
            // Find an available amount between 001-200
            const findAvailableAmount = (attempt = 0) => {
                if (attempt > 200) {
                    return reject(new Error('No unique amounts available'));
                }
                
                // Generate random number between 1-200
                const randomNum = Math.floor(Math.random() * 200) + 1;
                const uniqueAmount = randomNum.toString().padStart(3, '0');
                
                // Check if this amount is available
                db.get(`
                    SELECT unique_amount FROM unique_amounts 
                    WHERE unique_amount = ? 
                    AND expires_at > datetime('now')
                `, [uniqueAmount], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    
                    if (!row) {
                        // Amount is available, reserve it
                        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
                        
                        db.run(`
                            INSERT INTO unique_amounts (
                                unique_amount, order_reference, expires_at
                            ) VALUES (?, ?, ?)
                        `, [uniqueAmount, orderRef, expiresAt], function(insertErr) {
                            if (insertErr) {
                                // Might be a race condition, try again
                                return findAvailableAmount(attempt + 1);
                            }
                            
                            console.log(`🎲 Generated unique amount: ${uniqueAmount} for order: ${orderRef}`);
                            resolve(uniqueAmount);
                        });
                    } else {
                        // Amount is taken, try another
                        findAvailableAmount(attempt + 1);
                    }
                });
            };
            
            findAvailableAmount();
        });
    });
}

/**
 * Enhanced QRIS conversion with unique amount integration
 * @param {string} staticQRIS - Static QRIS code
 * @param {string} originalAmount - Original transaction amount
 * @param {string} uniqueAmount - Unique 3-digit amount for identification
 * @param {Object} serviceFee - Optional service fee
 * @returns {string} Dynamic QRIS with unique amount
 */
function convertWithUniqueAmount(staticQRIS, originalAmount, uniqueAmount, serviceFee = null) {
    // Use the unique amount for QRIS generation
    return QRISConverter.convertStaticToDynamic(staticQRIS, uniqueAmount, serviceFee);
}

module.exports = {
    setupQRISRoutes,
    checkPaymentMatch,
    setupPaymentExpectationsTable,
    generateUniqueAmount,
    convertWithUniqueAmount
};