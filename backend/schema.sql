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