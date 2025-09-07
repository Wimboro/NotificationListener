const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const qrisIntegration = require('./qris-integration');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'notifications.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            app_name TEXT,
            posted_at TEXT,
            title TEXT,
            text TEXT,
            sub_text TEXT,
            big_text TEXT,
            channel_id TEXT,
            notification_id INTEGER,
            amount_detected TEXT,
            extras TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_notifications INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Add payment expectations table setup
    qrisIntegration.setupPaymentExpectationsTable(db);
});

// API Key validation middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (API_KEY && API_KEY !== 'your-secret-api-key') {
        if (!apiKey || apiKey !== API_KEY) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or missing API key' 
            });
        }
    }
    
    next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main webhook endpoint for notifications
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
        db.run(`
            INSERT OR REPLACE INTO devices (device_id, last_seen, total_notifications)
            VALUES (?, ?, COALESCE((SELECT total_notifications FROM devices WHERE device_id = ?) + 1, 1))
        `, [deviceId, new Date().toISOString(), deviceId]);

        // Insert notification
        db.run(`
            INSERT INTO notifications (
                device_id, package_name, app_name, posted_at, title, text,
                sub_text, big_text, channel_id, notification_id, amount_detected, extras
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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

            console.log(`Notification received from ${deviceId}:`, {
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

// Test endpoint
app.post('/test', validateApiKey, (req, res) => {
    console.log('Test notification received:', req.body);
    
    res.json({
        success: true,
        message: 'Test notification received successfully',
        timestamp: new Date().toISOString(),
        data: req.body
    });
});

// Get notifications
app.get('/notifications', validateApiKey, (req, res) => {
    const { device_id, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM notifications';
    let params = [];
    
    if (device_id) {
        query += ' WHERE device_id = ?';
        params.push(device_id);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
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

// Get devices
app.get('/devices', validateApiKey, (req, res) => {
    db.all('SELECT * FROM devices ORDER BY last_seen DESC', (err, rows) => {
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

// Get statistics
app.get('/stats', validateApiKey, (req, res) => {
    const queries = {
        totalNotifications: 'SELECT COUNT(*) as count FROM notifications',
        totalDevices: 'SELECT COUNT(*) as count FROM devices',
        notificationsToday: `SELECT COUNT(*) as count FROM notifications 
                           WHERE date(created_at) = date('now')`,
        topApps: `SELECT package_name, app_name, COUNT(*) as count 
                 FROM notifications 
                 GROUP BY package_name, app_name 
                 ORDER BY count DESC LIMIT 10`
    };
    
    const stats = {};
    let completed = 0;
    const total = Object.keys(queries).length;
    
    Object.entries(queries).forEach(([key, query]) => {
        db.all(query, (err, rows) => {
            if (!err) {
                if (key === 'topApps') {
                    stats[key] = rows;
                } else {
                    stats[key] = rows[0].count;
                }
            }
            
            completed++;
            if (completed === total) {
                res.json({
                    success: true,
                    data: stats
                });
            }
        });
    });
});

// Add QRIS routes
qrisIntegration.setupQRISRoutes(app, validateApiKey, db);

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Notification Listener Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 Webhook endpoint: http://localhost:${PORT}/webhook`);
    console.log(`🔧 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`📱 API Key: ${API_KEY === 'your-secret-api-key' ? 'Not configured (set API_KEY env variable)' : 'Configured'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('📦 Database connection closed.');
        }
        process.exit(0);
    });
});