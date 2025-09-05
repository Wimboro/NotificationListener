package com.hiddencyber.notificationlistener.data.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

@Entity(tableName = "notification_logs")
data class NotificationLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    @ColumnInfo(name = "timestamp")
    val timestamp: Long,
    
    @ColumnInfo(name = "message")
    val message: String,
    
    @ColumnInfo(name = "type")
    val type: String, // SUCCESS, ERROR, INFO, QUEUED
    
    @ColumnInfo(name = "details")
    val details: String? = null
)