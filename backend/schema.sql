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
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_notifications INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- QRIS Payment Integration Tables
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
);

CREATE TABLE IF NOT EXISTS unique_amounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_amount TEXT UNIQUE NOT NULL,
    order_reference TEXT,
    status TEXT DEFAULT 'used',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);