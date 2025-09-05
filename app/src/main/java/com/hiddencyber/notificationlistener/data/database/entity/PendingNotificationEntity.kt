package com.hiddencyber.notificationlistener.data.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

@Entity(tableName = "pending_notifications")
data class PendingNotificationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    @ColumnInfo(name = "json_payload")
    val jsonPayload: String,
    
    @ColumnInfo(name = "endpoint_url")
    val endpointUrl: String,
    
    @ColumnInfo(name = "api_key")
    val apiKey: String?,
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long,
    
    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,
    
    @ColumnInfo(name = "last_error")
    val lastError: String? = null
)