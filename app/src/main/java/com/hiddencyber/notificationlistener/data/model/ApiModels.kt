package com.hiddencyber.notificationlistener.data.model

import com.google.gson.annotations.SerializedName

data class NotificationPayload(
    @SerializedName("deviceId")
    val deviceId: String,
    
    @SerializedName("packageName")
    val packageName: String,
    
    @SerializedName("appName")
    val appName: String,
    
    @SerializedName("postedAt")
    val postedAt: String,
    
    @SerializedName("title")
    val title: String?,
    
    @SerializedName("text")
    val text: String?,
    
    @SerializedName("subText")
    val subText: String?,
    
    @SerializedName("bigText")
    val bigText: String?,
    
    @SerializedName("channelId")
    val channelId: String?,
    
    @SerializedName("notificationId")
    val notificationId: Int,
    
    @SerializedName("amountDetected")
    val amountDetected: String?,
    
    @SerializedName("extras")
    val extras: Map<String, String>?
)

data class ApiResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String? = null,
    
    @SerializedName("data")
    val data: Any? = null
)

data class TestPayload(
    @SerializedName("message")
    val message: String
)