// Cloudflare Workers adaptation of the notification listener backend
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
      default:
        response = createJsonResponse({
          success: false,
          error: 'Endpoint not found'
        }, 404, corsHeaders);
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