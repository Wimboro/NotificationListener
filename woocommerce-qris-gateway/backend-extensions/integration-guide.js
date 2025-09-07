/**
 * Backend Integration Script for QRIS Payment Gateway
 * 
 * This script shows how to integrate QRIS functionality into the existing backend.
 * Copy these modifications to your backend/server.js file.
 */

const path = require('path');

// 1. Add this import at the top of server.js (after existing imports)
const qrisIntegration = require('../woocommerce-qris-gateway/backend-extensions/qris-integration');

// 2. Add payment expectations table setup after existing table creation
// In the db.serialize() block, add:
/*
qrisIntegration.setupPaymentExpectationsTable(db);
*/

// 3. Add QRIS routes after existing routes
// After the existing route definitions, add:
/*
qrisIntegration.setupQRISRoutes(app, validateApiKey, db);
*/

// 4. Enhance the existing webhook endpoint to check for payment matches
// In the existing /webhook endpoint, after notification insertion success, add:
/*
// Check for payment matches if amount detected
if (amountDetected) {
    qrisIntegration.checkPaymentMatch(db, text, title, bigText, amountDetected);
}
*/

// Example of complete enhanced webhook endpoint:
function enhancedWebhookExample() {
    return `
app.post('/webhook', validateApiKey, (req, res) => {
    try {
        const {
            deviceId,
            packageName,
            appName,
            postedAt,
            title,
            text,
            subText,
            bigText,
            channelId,
            notificationId,
            amountDetected,
            extras
        } = req.body;

        // Validate required fields
        if (!deviceId || !packageName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: deviceId, packageName'
            });
        }

        // Update device info
        db.run(\`
            INSERT OR REPLACE INTO devices (device_id, last_seen, total_notifications)
            VALUES (?, ?, COALESCE((SELECT total_notifications FROM devices WHERE device_id = ?) + 1, 1))
        \`, [deviceId, new Date().toISOString(), deviceId]);

        // Insert notification
        db.run(\`
            INSERT INTO notifications (
                device_id, package_name, app_name, posted_at, title, text,
                sub_text, big_text, channel_id, notification_id, amount_detected, extras
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`, [
            deviceId, packageName, appName, postedAt, title, text,
            subText, bigText, channelId, notificationId, amountDetected,
            JSON.stringify(extras)
        ], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            console.log(\`Notification received from \${deviceId}:\`, {
                packageName,
                title,
                text: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
                amountDetected
            });

            // ENHANCED: Check for payment matches if amount detected
            if (amountDetected) {
                qrisIntegration.checkPaymentMatch(db, text, title, bigText, amountDetected);
            }

            res.json({
                success: true,
                message: 'Notification received successfully',
                id: this.lastID,
                timestamp: new Date().toISOString()
            });
        });

    } catch (error) {
        console.error('Error processing notification:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
    `;
}

module.exports = {
    enhancedWebhookExample
};