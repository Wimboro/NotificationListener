package com.hiddencyber.notificationlistener.service

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.hiddencyber.notificationlistener.data.model.NotificationPayload
import com.hiddencyber.notificationlistener.data.repository.NotificationRepository
import com.hiddencyber.notificationlistener.data.preferences.UserPreferencesRepository
import com.hiddencyber.notificationlistener.utils.NotificationUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*
import javax.inject.Inject

@AndroidEntryPoint
class NotificationCaptureService : NotificationListenerService() {
    
    companion object {
        private const val TAG = "NotificationCaptureService"
        
        fun isNotificationAccessGranted(context: Context, packageName: String): Boolean {
            return try {
                val componentName = ComponentName(packageName, NotificationCaptureService::class.java.name)
                val flattenedComponentName = componentName.flattenToString()
                
                // Get enabled notification listeners from system settings
                val enabledNotificationListeners = Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                )
                
                enabledNotificationListeners?.contains(flattenedComponentName) == true
            } catch (e: Exception) {
                false
            }
        }
    }
    
    @Inject
    lateinit var notificationRepository: NotificationRepository
    
    @Inject
    lateinit var userPreferencesRepository: UserPreferencesRepository
    
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "NotificationCaptureService created")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "NotificationCaptureService destroyed")
    }
    
    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
        serviceScope.launch {
            notificationRepository.insertLog("Notification listener terhubung", "INFO")
        }
    }
    
    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
        serviceScope.launch {
            notificationRepository.insertLog("Notification listener terputus", "INFO")
        }
        
        // Try to reconnect
        requestRebind(ComponentName(this, NotificationCaptureService::class.java))
    }
    
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        super.onNotificationPosted(sbn)
        
        serviceScope.launch {
            try {
                processNotification(sbn)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing notification", e)
                notificationRepository.insertLog("Error memproses notifikasi: ${e.message}", "ERROR")
            }
        }
    }
    
    private suspend fun processNotification(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // Skip our own notifications
        if (packageName == this.packageName) {
            return
        }
        
        // Skip system notifications that are not user-visible
        if (isSystemNotification(sbn)) {
            return
        }
        
        val notification = sbn.notification
        val extras = notification.extras
        
        // Check if we should forward this notification
        val shouldForward = shouldForwardNotification(packageName)
        
        if (!shouldForward) {
            Log.d(TAG, "Skipping notification from $packageName (not in filter list)")
            return
        }
        
        // Get device ID
        val deviceId = getOrCreateDeviceId()
        if (deviceId.isEmpty()) {
            Log.e(TAG, "Device ID is empty")
            return
        }
        
        // Extract notification data
        val appName = getAppName(packageName)
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val channelId = notification.channelId
        val notificationId = sbn.id
        
        // Create timestamp in ISO format with timezone
        val postedAt = DateTimeFormatter.ISO_OFFSET_DATE_TIME
            .withZone(ZoneId.systemDefault())
            .format(Instant.ofEpochMilli(sbn.postTime))
        
        // Detect Rupiah amounts
        val amountDetected = NotificationUtils.detectRupiahAmount(text, bigText, title)
        
        // Convert extras to string map
        val extrasMap = convertExtrasToMap(extras)
        
        // Create payload
        val payload = NotificationPayload(
            deviceId = deviceId,
            packageName = packageName,
            appName = appName,
            postedAt = postedAt,
            title = title,
            text = text,
            subText = subText,
            bigText = bigText,
            channelId = channelId,
            notificationId = notificationId,
            amountDetected = amountDetected,
            extras = extrasMap
        )
        
        Log.d(TAG, "Processing notification from $packageName: $title - $text")
        
        // Send notification
        notificationRepository.sendNotification(payload)
    }
    
    private fun isSystemNotification(sbn: StatusBarNotification): Boolean {
        val notification = sbn.notification
        
        // Skip ongoing/persistent notifications
        if ((notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) {
            return true
        }
        
        // Skip group summary notifications that don't have content
        if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) {
            val hasContent = notification.extras.getCharSequence(Notification.EXTRA_TEXT) != null ||
                    notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT) != null
            if (!hasContent) {
                return true
            }
        }
        
        return false
    }
    
    private suspend fun shouldForwardNotification(packageName: String): Boolean {
        val forwardAll = userPreferencesRepository.getForwardAllAppsSync()
        
        if (forwardAll) {
            return true
        }
        
        val filterPackages = userPreferencesRepository.getFilterPackagesSync()
        if (filterPackages.isBlank()) {
            return false
        }
        
        val packageList = filterPackages.split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
        
        return packageList.contains(packageName)
    }
    
    private suspend fun getOrCreateDeviceId(): String {
        var deviceId = userPreferencesRepository.getDeviceIdSync()
        
        if (deviceId.isEmpty()) {
            deviceId = UUID.randomUUID().toString()
            userPreferencesRepository.setDeviceId(deviceId)
            Log.d(TAG, "Generated new device ID: $deviceId")
        }
        
        return deviceId
    }
    
    private fun getAppName(packageName: String): String {
        return try {
            val applicationInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(applicationInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            Log.w(TAG, "App name not found for package: $packageName")
            packageName
        }
    }
    
    private fun convertExtrasToMap(extras: Bundle): Map<String, String> {
        val map = mutableMapOf<String, String>()
        
        for (key in extras.keySet()) {
            try {
                val value = extras.get(key)
                if (value != null) {
                    map[key] = value.toString()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error converting extra key $key", e)
            }
        }
        
        return map
    }
}