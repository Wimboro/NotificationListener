// Cloudflare Workers adaptation of the notification listener backend with QRIS integration
// Import QRIS converter functionality
import { QRISConverter } from './qris-converter.js';

export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // API Key validation
  const apiKey = request.headers.get('x-api-key');
  const requiredApiKey = env.API_KEY || 'your-secret-api-key';
  
  // Skip API key check for health endpoint
  if (pathname !== '/health' && requiredApiKey !== 'your-secret-api-key') {
    if (!apiKey || apiKey !== requiredApiKey) {
      return createJsonResponse({ 
        success: false, 
        error: 'Invalid or missing API key' 
      }, 401, corsHeaders);
    }
  }

  // Initialize database tables if needed
  try {
    await initializeTables(env.DB);
  } catch (error) {
    console.error('Error initializing tables:', error);
  }

  // Route handling
  try {
    let response;
    
    switch (pathname) {
      case '/health':
        response = await handleHealth();
        break;
      case '/webhook':
        if (method === 'POST') {
          response = await handleWebhook(request, env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/test':
        if (method === 'POST') {
          response = await handleTest(request);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/notifications':
        if (method === 'GET') {
          response = await handleGetNotifications(request, env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/devices':
        if (method === 'GET') {
          response = await handleGetDevices(env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/stats':
        if (method === 'GET') {
          response = await handleGetStats(env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      // QRIS endpoints
      case '/qris/convert':
        if (method === 'POST') {
          response = await handleQRISConvert(request, env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/qris/validate':
        if (method === 'POST') {
          response = await handleQRISValidate(request);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      case '/qris/generate-for-order':
        if (method === 'POST') {
          response = await handleQRISGenerateForOrder(request, env);
        } else {
          response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
        }
        break;
      // WooCommerce endpoints
      default:
        if (pathname.startsWith('/woocommerce/payment-status/')) {
          if (method === 'GET') {
            response = await handleWooCommercePaymentStatus(request, env);
          } else {
            response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
          }
        } else if (pathname === '/woocommerce/payment-webhook') {
          if (method === 'POST') {
            response = await handleWooCommercePaymentWebhook(request, env);
          } else {
            response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
          }
        } else if (pathname.startsWith('/qris/unique-amount/')) {
          if (method === 'GET') {
            response = await handleQRISUniqueAmount(request, env);
          } else {
            response = createJsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
          }
        } else {
          response = createJsonResponse({
            success: false,
            error: 'Endpoint not found'
          }, 404, corsHeaders);
        }
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;

  } catch (error) {
    console.error('Error handling request:', error);
    return createJsonResponse({
      success: false,
      error: 'Internal server error'
    }, 500, corsHeaders);
  }
}

async function initializeTables(db) {
  try {
    // Original notification and device tables
    await db.prepare(`
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
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_notifications INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // QRIS payment expectations table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS payment_expectations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_reference TEXT UNIQUE NOT NULL,
        expected_amount TEXT NOT NULL,
        unique_amount TEXT,
        original_amount TEXT,
        callback_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `).run();

    // Unique amounts tracking table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS unique_amounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unique_amount TEXT UNIQUE NOT NULL,
        order_reference TEXT,
        status TEXT DEFAULT 'used',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `).run();

  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

function createJsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

async function handleHealth() {
  return createJsonResponse({
    status: 'OK',
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers'
  });
}

async function handleWebhook(request, env) {
  try {
    const body = await request.json();
    console.log('Received webhook data:', JSON.stringify(body, null, 2));
    
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
    } = body;

    // Validate required fields
    if (!deviceId || !packageName) {
      console.log('Missing required fields:', { deviceId, packageName });
      return createJsonResponse({
        success: false,
        error: 'Missing required fields: deviceId, packageName'
      }, 400);
    }

    const timestamp = new Date().toISOString();
    console.log('Processing notification for device:', deviceId, 'package:', packageName);

    // Update device info
    try {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO devices (device_id, last_seen, total_notifications)
        VALUES (?, ?, COALESCE((SELECT total_notifications FROM devices WHERE device_id = ?) + 1, 1))
      `).bind(deviceId || null, timestamp, deviceId || null).run();
      console.log('Device info updated successfully');
    } catch (deviceError) {
      console.error('Error updating device info:', deviceError);
      // Continue with notification insert even if device update fails
    }

    // Insert notification - handle undefined values
    try {
      const result = await env.DB.prepare(`
        INSERT INTO notifications (
          device_id, package_name, app_name, posted_at, title, text,
          sub_text, big_text, channel_id, notification_id, amount_detected, extras
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        deviceId || null,
        packageName || null,
        appName || null,
        postedAt || null,
        title || null,
        text || null,
        subText || null,
        bigText || null,
        channelId || null,
        notificationId || null,
        amountDetected || null,
        extras ? JSON.stringify(extras) : null
      ).run();
      
      console.log('Notification inserted successfully with ID:', result.meta?.last_row_id);

      console.log(`Notification received from ${deviceId}:`, {
        packageName,
        title,
        text: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
        amountDetected
      });

      // Enhanced: Check for payment matches if amount detected
      if (amountDetected) {
        await checkPaymentMatch(env.DB, text, title, bigText, amountDetected, env);
      }

      return createJsonResponse({
        success: true,
        message: 'Notification received successfully',
        id: result.meta?.last_row_id,
        timestamp: timestamp
      });
      
    } catch (insertError) {
      console.error('Error inserting notification:', insertError);
      return createJsonResponse({
        success: false,
        error: 'Failed to insert notification: ' + insertError.message
      }, 500);
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}

async function handleTest(request) {
  try {
    const body = await request.json();
    console.log('Test notification received:', body);
    
    return createJsonResponse({
      success: true,
      message: 'Test notification received successfully',
      timestamp: new Date().toISOString(),
      data: body
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: 'Invalid JSON body'
    }, 400);
  }
}

async function handleGetNotifications(request, env) {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('device_id');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    let query = 'SELECT * FROM notifications';
    let params = [];

    if (deviceId) {
      query += ' WHERE device_id = ?';
      params.push(deviceId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...params).all();
    console.log('Retrieved notifications:', result.results?.length || 0);

    return createJsonResponse({
      success: true,
      data: result.results || [],
      count: result.results ? result.results.length : 0
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}

async function handleGetDevices(env) {
  try {
    const result = await env.DB.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
    console.log('Retrieved devices:', result.results?.length || 0);

    return createJsonResponse({
      success: true,
      data: result.results || [],
      count: result.results ? result.results.length : 0
    });

  } catch (error) {
    console.error('Get devices error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}

async function handleGetStats(env) {
  try {
    const totalNotifications = await env.DB.prepare('SELECT COUNT(*) as count FROM notifications').first();
    const totalDevices = await env.DB.prepare('SELECT COUNT(*) as count FROM devices').first();
    const notificationsToday = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE date(created_at) = date('now')
    `).first();
    const topApps = await env.DB.prepare(`
      SELECT package_name, app_name, COUNT(*) as count 
      FROM notifications 
      GROUP BY package_name, app_name 
      ORDER BY count DESC LIMIT 10
    `).all();

    console.log('Retrieved stats successfully');

    return createJsonResponse({
      success: true,
      data: {
        totalNotifications: totalNotifications?.count || 0,
        totalDevices: totalDevices?.count || 0,
        notificationsToday: notificationsToday?.count || 0,
        topApps: topApps.results || []
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}

// ========================================
// QRIS Integration Functions
// ========================================

/**
 * Check for payment matches when amount is detected in notification
 */
async function checkPaymentMatch(db, text, title, bigText, amountDetected, env) {
  try {
    console.log(`🔍 Checking payment match for amount: ${amountDetected}`);
    
    const normalizedAmount = parseInt(amountDetected, 10).toString();
    
    // First, try to find payment expectation by exact amount match
    const expectationResult = await db.prepare(`
      SELECT * FROM payment_expectations 
      WHERE (expected_amount = ? OR CAST(expected_amount AS INTEGER) = ?) 
      AND status = 'pending'
      AND created_at > datetime('now', '-5 minutes')
      ORDER BY created_at DESC
    `).bind(amountDetected, normalizedAmount).all();
    
    const expectations = expectationResult.results || [];
    console.log(`💵 Found ${expectations.length} pending expectation(s) for amount: ${amountDetected}`);
    
    if (expectations.length === 0) {
      console.log('❌ No matching payment expectations found');
      return;
    }
    
    // Search text for order reference matching
    const searchText = (text + ' ' + title + ' ' + (bigText || '')).toLowerCase();
    console.log(`📝 Search text: ${searchText.substring(0, 100)}...`);
    
    let matchedExpectation = null;
    let matchType = 'none';
    
    // Try to match by order reference first
    for (const expectation of expectations) {
      console.log(`🔍 Checking order reference: ${expectation.order_reference}`);
      if (searchText.includes(expectation.order_reference.toLowerCase())) {
        matchedExpectation = expectation;
        matchType = 'order_reference_match';
        console.log('✅ Order reference found in notification text');
        break;
      }
    }
    
    // If no order reference match, use amount-only matching if there's only one expectation
    if (!matchedExpectation) {
      console.log('❌ Order reference not found in notification text');
      
      // Check if there's exactly one pending expectation with this amount in the last 5 minutes
      const recentExpectationsResult = await db.prepare(`
        SELECT COUNT(*) as count FROM payment_expectations 
        WHERE (expected_amount = ? OR CAST(expected_amount AS INTEGER) = ?) 
        AND status = 'pending'
        AND created_at > datetime('now', '-5 minutes')
      `).bind(amountDetected, normalizedAmount).first();
      
      const recentCount = recentExpectationsResult?.count || 0;
      console.log(`📊 Found ${recentCount} pending expectation(s) with amount ${amountDetected} in last 5 minutes`);
      
      if (recentCount === 1) {
        matchedExpectation = expectations[0];
        matchType = 'amount_only_match';
        console.log('✅ Only one pending expectation found - assuming amount-only match');
      } else {
        console.log(`❌ Multiple or no expectations found (${recentCount}), cannot use amount-only matching`);
        return;
      }
    }
    
    if (matchedExpectation) {
      console.log(`✅ Payment matched! Order: ${matchedExpectation.order_reference}, Expected: ${matchedExpectation.expected_amount}, Detected: ${amountDetected} (Match type: ${matchType})`);
      
      // Verify amount matches (with normalization)
      const normalizedDetected = parseInt(amountDetected, 10).toString();
      const normalizedExpected = parseInt(matchedExpectation.expected_amount, 10).toString();
      
      if (normalizedDetected === normalizedExpected) {
        console.log(`✅ Amount verification passed: ${normalizedDetected} === ${normalizedExpected} (expected_amount (combined): ${matchedExpectation.expected_amount} vs detected: ${amountDetected})`);
        
        // Mark as completed
        await db.prepare(`
          UPDATE payment_expectations 
          SET status = 'completed', completed_at = ? 
          WHERE id = ?
        `).bind(new Date().toISOString(), matchedExpectation.id).run();
        
        // Notify WooCommerce if callback URL is provided
        if (matchedExpectation.callback_url) {
          await notifyWooCommerce(matchedExpectation.callback_url, {
            order_reference: matchedExpectation.order_reference,
            amount: amountDetected,
            expected_amount: matchedExpectation.expected_amount,
            status: 'completed',
            notification_text: text,
            match_type: matchType,
            timestamp: new Date().toISOString()
          }, env);
        }
      } else {
        console.error(`❌ Amount mismatch after normalization! Expected: ${normalizedExpected}, Detected: ${normalizedDetected}`);
      }
    } else {
      console.log('❌ No payment expectation matched');
    }
    
  } catch (error) {
    console.error('Error in payment matching:', error);
  }
}

/**
 * Notify WooCommerce about payment completion
 */
async function notifyWooCommerce(callbackUrl, paymentData, env) {
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'NotificationListener-QRIS',
        'X-API-Key': env?.API_KEY || 'your-secret-api-key'
      },
      body: JSON.stringify(paymentData)
    });
    
    console.log(`WooCommerce notification sent: ${response.status}`);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`WooCommerce notification error response: ${responseText}`);
    } else {
      const responseText = await response.text();
      console.log(`WooCommerce notification response: ${responseText}`);
    }
    
  } catch (error) {
    console.error('Failed to notify WooCommerce:', error.message);
  }
}

/**
 * Generate unique 3-digit amount for transaction identification
 */
async function generateUniqueAmount(db, orderRef) {
  try {
    // First, check if this order already has a unique amount assigned
    const existingResult = await db.prepare(`
      SELECT unique_amount FROM unique_amounts 
      WHERE order_reference = ? 
      AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).bind(orderRef).first();
    
    if (existingResult) {
      console.log(`♻️  Reusing unique amount: ${existingResult.unique_amount} for order: ${orderRef}`);
      return existingResult.unique_amount;
    }
    
    // Clean up expired amounts (older than 1 hour)
    await db.prepare(`
      DELETE FROM unique_amounts 
      WHERE expires_at < datetime('now')
    `).run();
    
    // Find an available amount between 001-200
    let attempts = 0;
    const maxAttempts = 200;
    
    while (attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * 200) + 1;
      const uniqueAmount = randomNum.toString().padStart(3, '0');
      
      // Check if this amount is available
      const existingAmountResult = await db.prepare(`
        SELECT unique_amount FROM unique_amounts 
        WHERE unique_amount = ? 
        AND expires_at > datetime('now')
      `).bind(uniqueAmount).first();
      
      if (!existingAmountResult) {
        // Amount is available, reserve it
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        
        try {
          await db.prepare(`
            INSERT INTO unique_amounts (
              unique_amount, order_reference, expires_at
            ) VALUES (?, ?, ?)
          `).bind(uniqueAmount, orderRef, expiresAt).run();
          
          console.log(`🎲 Generated unique amount: ${uniqueAmount} for order: ${orderRef}`);
          return uniqueAmount;
        } catch (insertErr) {
          // Might be a race condition, try again
          attempts++;
          continue;
        }
      }
      
      attempts++;
    }
    
    throw new Error('No unique amounts available');
    
  } catch (error) {
    console.error('Error generating unique amount:', error);
    throw error;
  }
}

/**
 * Handle QRIS conversion endpoint
 */
async function handleQRISConvert(request, env) {
  try {
    const body = await request.json();
    const { staticQRIS, amount, serviceFee, orderRef } = body;
    
    // Enhanced logging for debugging
    console.log('QRIS Convert Request:', {
      staticQRIS: staticQRIS ? `${staticQRIS.substring(0, 50)}...` : 'undefined',
      amount,
      serviceFee,
      orderRef,
      bodyKeys: Object.keys(body)
    });
    
    // Validate required fields
    if (!staticQRIS || !amount) {
      console.error('Missing required fields:', { staticQRIS: !!staticQRIS, amount: !!amount });
      return createJsonResponse({
        success: false,
        error: 'Missing required fields: staticQRIS, amount'
      }, 400);
    }
    
    // Validate QRIS format
    const isValidQRIS = QRISConverter.validateQRIS(staticQRIS);
    console.log('QRIS Validation:', { 
      isValid: isValidQRIS, 
      qrisLength: staticQRIS.length,
      qrisStart: staticQRIS.substring(0, 20),
      qrisEnd: staticQRIS.substring(-10)
    });
    
    if (!isValidQRIS) {
      return createJsonResponse({
        success: false,
        error: 'Invalid QRIS format - failed validation',
        debug: {
          qrisLength: staticQRIS.length,
          qrisStart: staticQRIS.substring(0, 20),
          hasIndonesiaCode: staticQRIS.includes('5802ID'),
          hasCorrectStart: staticQRIS.startsWith('000201')
        }
      }, 400);
    }
    
    let uniqueAmount = amount;
    let useUniqueAmount = false;
    
    // If orderRef provided, generate unique 3-digit amount
    if (orderRef) {
      try {
        uniqueAmount = await generateUniqueAmount(env.DB, orderRef);
        useUniqueAmount = true;
        console.log(`🎲 Using unique amount ${uniqueAmount} for order ${orderRef} (original: ${amount})`);
      } catch (uniqueErr) {
        console.error('Failed to generate unique amount:', uniqueErr);
        return createJsonResponse({
          success: false,
          error: 'Failed to generate unique amount: ' + uniqueErr.message
        }, 500);
      }
    }
    
    // Convert to dynamic QRIS using combined amount (original + unique)
    const combinedAmount = useUniqueAmount ? (parseInt(amount) + parseInt(uniqueAmount)).toString() : amount;
    
    let dynamicQRIS;
    try {
      dynamicQRIS = QRISConverter.convertStaticToDynamic(
        staticQRIS, 
        combinedAmount, 
        serviceFee
      );
    } catch (conversionError) {
      console.error('QRIS conversion failed:', conversionError);
      return createJsonResponse({
        success: false,
        error: 'QRIS conversion failed: ' + conversionError.message,
        debug: {
          staticQRIS: staticQRIS.substring(0, 50) + '...',
          combinedAmount,
          isValidQRIS
        }
      }, 400);
    }
    
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
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('QRIS conversion error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return createJsonResponse({
      success: false,
      error: error.message,
      errorType: error.name
    }, 500);
  }
}

/**
 * Handle QRIS validation endpoint
 */
async function handleQRISValidate(request) {
  try {
    const body = await request.json();
    const { qris } = body;
    
    if (!qris) {
      return createJsonResponse({
        success: false,
        error: 'Missing QRIS code'
      }, 400);
    }
    
    const isValid = QRISConverter.validateQRIS(qris);
    const extractedAmount = QRISConverter.extractAmount(qris);
    
    return createJsonResponse({
      success: true,
      valid: isValid,
      type: qris.includes('010212') ? 'dynamic' : 'static',
      amount: extractedAmount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('QRIS validation error:', error);
    return createJsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Handle QRIS generation for order endpoint
 */
async function handleQRISGenerateForOrder(request, env) {
  try {
    const body = await request.json();
    const { staticQRIS, originalAmount, orderRef, callbackUrl, serviceFee } = body;
    
    if (!staticQRIS || !originalAmount || !orderRef) {
      return createJsonResponse({
        success: false,
        error: 'Missing required fields: staticQRIS, originalAmount, orderRef'
      }, 400);
    }
    
    // Validate QRIS format
    if (!QRISConverter.validateQRIS(staticQRIS)) {
      return createJsonResponse({
        success: false,
        error: 'Invalid QRIS format'
      }, 400);
    }
    
    // Generate unique 3-digit amount
    const uniqueAmount = await generateUniqueAmount(env.DB, orderRef);
    
    // Calculate combined amount (original + unique)
    const combinedAmount = (parseInt(originalAmount) + parseInt(uniqueAmount)).toString();
    
    // Convert to dynamic QRIS with combined amount
    const dynamicQRIS = QRISConverter.convertStaticToDynamic(
      staticQRIS, 
      combinedAmount, 
      serviceFee
    );
    
    // Store payment expectation
    const result = await env.DB.prepare(`
      INSERT OR REPLACE INTO payment_expectations (
        order_reference, expected_amount, unique_amount, original_amount, callback_url, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).bind(orderRef, combinedAmount, uniqueAmount, originalAmount, callbackUrl, new Date().toISOString()).run();
    
    console.log(`🎲 QRIS generated for order ${orderRef}: combined amount ${combinedAmount} (unique: ${uniqueAmount}, original: ${originalAmount})`);
    
    return createJsonResponse({
      success: true,
      order_reference: orderRef,
      dynamic_qris: dynamicQRIS,
      combined_amount: combinedAmount,
      unique_amount: uniqueAmount,
      original_amount: originalAmount,
      amount_for_payment: combinedAmount,
      payment_expectation_id: result.meta?.last_row_id,
      instructions: {
        customer: `Please pay exactly ${combinedAmount} IDR using the QR code`,
        system: `Monitor notifications for amount ${combinedAmount} to confirm payment`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('QRIS generation error:', error);
    return createJsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Handle WooCommerce payment status check
 */
async function handleWooCommercePaymentStatus(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderRef = pathParts[pathParts.length - 1];
    const timeoutMinutes = url.searchParams.get('timeout') || 15;
    
    const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    
    // First, check if there's a payment expectation for this order
    const expectation = await env.DB.prepare(`
      SELECT * FROM payment_expectations 
      WHERE order_reference = ? 
      AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(orderRef, timeoutDate).first();
    
    if (!expectation) {
      return createJsonResponse({
        success: true,
        payment_found: false,
        error: 'No payment expectation found for this order',
        order_reference: orderRef
      });
    }
    
    // If payment expectation already completed, return success
    if (expectation.status === 'completed') {
      return createJsonResponse({
        success: true,
        payment_found: true,
        amount: expectation.expected_amount,
        status: 'completed',
        completed_at: expectation.completed_at,
        order_reference: orderRef
      });
    }
    
    // Search for payment notifications matching both order reference AND expected amount
    const normalizedExpectedAmount = parseInt(expectation.expected_amount || expectation.unique_amount, 10).toString();
    
    const notification = await env.DB.prepare(`
      SELECT * FROM notifications 
      WHERE (text LIKE ? OR title LIKE ? OR big_text LIKE ?) 
      AND (amount_detected = ? OR CAST(amount_detected AS INTEGER) = ?)
      AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(
      `%${orderRef}%`, 
      `%${orderRef}%`, 
      `%${orderRef}%`,
      expectation.expected_amount || expectation.unique_amount,
      normalizedExpectedAmount,
      timeoutDate
    ).first();
    
    if (notification) {
      // Payment found and amount matches! Mark expectation as completed
      await env.DB.prepare(`
        UPDATE payment_expectations 
        SET status = 'completed', completed_at = ? 
        WHERE id = ?
      `).bind(new Date().toISOString(), expectation.id).run();
      
      console.log(`✅ Payment confirmed via status check! Order: ${orderRef}, Amount: ${expectation.expected_amount}`);
      
      const normalizedNotificationAmount = parseInt(notification.amount_detected, 10).toString();
      const normalizedExpectedAmount = parseInt(expectation.expected_amount || expectation.unique_amount, 10).toString();
      
      return createJsonResponse({
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
      return createJsonResponse({
        success: true,
        payment_found: false,
        expected_amount: expectation.expected_amount,
        order_reference: orderRef,
        status: 'pending',
        message: 'Payment not yet detected or amount does not match'
      });
    }
    
  } catch (error) {
    console.error('Payment status check error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}

/**
 * Handle WooCommerce payment webhook registration
 */
async function handleWooCommercePaymentWebhook(request, env) {
  try {
    const body = await request.json();
    const { orderRef, expectedAmount, callbackUrl, useUniqueAmount = true } = body;
    
    if (!orderRef || !expectedAmount) {
      return createJsonResponse({
        success: false,
        error: 'Missing required fields: orderRef, expectedAmount'
      }, 400);
    }
    
    let uniqueAmount = expectedAmount;
    
    // Generate unique amount if requested
    if (useUniqueAmount) {
      try {
        uniqueAmount = await generateUniqueAmount(env.DB, orderRef);
        console.log(`🎲 Generated unique amount ${uniqueAmount} for order ${orderRef} (original: ${expectedAmount})`);
      } catch (uniqueErr) {
        console.error('Failed to generate unique amount:', uniqueErr);
        return createJsonResponse({
          success: false,
          error: 'Failed to generate unique amount: ' + uniqueErr.message
        }, 500);
      }
    }
    
    // Calculate combined amount (original + unique)
    const combinedAmount = useUniqueAmount ? (parseInt(expectedAmount) + parseInt(uniqueAmount)).toString() : expectedAmount;
    
    // Store payment expectation with combined amount as expected_amount
    const result = await env.DB.prepare(`
      INSERT OR REPLACE INTO payment_expectations (
        order_reference, expected_amount, unique_amount, original_amount, callback_url, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).bind(orderRef, combinedAmount, uniqueAmount, expectedAmount, callbackUrl, new Date().toISOString()).run();
    
    console.log(`Payment expectation registered: ${orderRef} - Combined: ${combinedAmount}, Unique: ${uniqueAmount}, Original: ${expectedAmount}`);
    
    const response = {
      success: true,
      message: 'Payment expectation registered',
      order_reference: orderRef,
      expected_amount: combinedAmount,
      id: result.meta?.last_row_id
    };
    
    if (useUniqueAmount) {
      response.original_amount = expectedAmount;
      response.unique_amount = uniqueAmount;
      response.combined_amount = combinedAmount;
      response.amount_type = 'combined';
    }
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('Payment webhook error:', error);
    return createJsonResponse({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
}

/**
 * Handle get unique amount for order
 */
async function handleQRISUniqueAmount(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderRef = pathParts[pathParts.length - 1];
    
    const row = await env.DB.prepare(`
      SELECT unique_amount, original_amount, status, created_at
      FROM payment_expectations 
      WHERE order_reference = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(orderRef).first();
    
    if (!row) {
      return createJsonResponse({
        success: false,
        error: 'Order not found'
      }, 404);
    }
    
    return createJsonResponse({
      success: true,
      order_reference: orderRef,
      unique_amount: row.unique_amount,
      original_amount: row.original_amount,
      status: row.status,
      created_at: row.created_at
    });
    
  } catch (error) {
    console.error('Get unique amount error:', error);
    return createJsonResponse({
      success: false,
      error: 'Database error: ' + error.message
    }, 500);
  }
}