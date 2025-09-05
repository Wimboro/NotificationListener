package com.hiddencyber.notificationlistener.data.repository

import android.content.Context
import android.util.Log
import com.hiddencyber.notificationlistener.data.database.dao.NotificationLogDao
import com.hiddencyber.notificationlistener.data.database.dao.PendingNotificationDao
import com.hiddencyber.notificationlistener.data.database.entity.NotificationLogEntity
import com.hiddencyber.notificationlistener.data.database.entity.PendingNotificationEntity
import com.hiddencyber.notificationlistener.data.model.NotificationPayload
import com.hiddencyber.notificationlistener.data.model.TestPayload
import com.hiddencyber.notificationlistener.data.network.NotificationApiService
import com.hiddencyber.notificationlistener.data.preferences.UserPreferencesRepository
import com.hiddencyber.notificationlistener.data.security.EncryptedPreferencesManager
import com.hiddencyber.notificationlistener.utils.NetworkUtils
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: NotificationApiService,
    private val notificationLogDao: NotificationLogDao,
    private val pendingNotificationDao: PendingNotificationDao,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val encryptedPreferencesManager: EncryptedPreferencesManager,
    private val gson: Gson
) {
    
    companion object {
        private const val TAG = "NotificationRepository"
    }
    
    fun getAllLogs(): Flow<List<NotificationLogEntity>> = notificationLogDao.getAllLogs()
    
    suspend fun insertLog(message: String, type: String, details: String? = null) {
        val log = NotificationLogEntity(
            timestamp = System.currentTimeMillis(),
            message = message,
            type = type,
            details = details
        )
        notificationLogDao.insertLog(log)
        
        // Clean up old logs to keep only 100 recent ones
        notificationLogDao.deleteOldLogs()
    }
    
    suspend fun clearAllLogs() {
        notificationLogDao.clearAllLogs()
        insertLog("Logs berhasil dibersihkan", "INFO")
    }
    
    suspend fun sendNotification(payload: NotificationPayload): Result<String> {
        return try {
            val endpointUrl = userPreferencesRepository.getEndpointUrlSync()
            val apiKey = encryptedPreferencesManager.getApiKey()
            
            if (endpointUrl.isBlank()) {
                return Result.failure(Exception("Endpoint URL tidak boleh kosong"))
            }
            
            if (!NetworkUtils.isNetworkAvailable(context)) {
                // Queue for later retry
                queueNotification(payload, endpointUrl, apiKey)
                insertLog("Tidak ada koneksi - notifikasi disimpan dalam antrian", "QUEUED", payload.packageName)
                return Result.success("Queued for retry")
            }
            
            val response = apiService.sendNotification(
                url = endpointUrl,
                apiKey = apiKey,
                payload = payload
            )
            
            if (response.isSuccessful) {
                val statusCode = response.code()
                insertLog("POST $statusCode ${payload.packageName} — ${payload.text?.take(50) ?: ""}", "SUCCESS")
                Result.success("Success: ${response.code()}")
            } else {
                val error = "HTTP ${response.code()}: ${response.message()}"
                queueNotification(payload, endpointUrl, apiKey)
                insertLog("Gagal kirim - disimpan dalam antrian: $error", "ERROR", payload.packageName)
                Result.failure(Exception(error))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending notification", e)
            val endpointUrl = userPreferencesRepository.getEndpointUrlSync()
            val apiKey = encryptedPreferencesManager.getApiKey()
            queueNotification(payload, endpointUrl, apiKey)
            insertLog("Error - disimpan dalam antrian: ${e.message}", "ERROR", payload.packageName)
            Result.failure(e)
        }
    }
    
    suspend fun sendTestNotification(): Result<String> {
        return try {
            val endpointUrl = userPreferencesRepository.getEndpointUrlSync()
            val apiKey = encryptedPreferencesManager.getApiKey()
            
            if (endpointUrl.isBlank()) {
                return Result.failure(Exception("Endpoint URL tidak boleh kosong"))
            }
            
            val testPayload = TestPayload(message = "This is a test notification from the Android app.")
            
            val response = apiService.sendTestNotification(
                url = endpointUrl,
                apiKey = apiKey,
                payload = testPayload
            )
            
            if (response.isSuccessful) {
                insertLog("Test berhasil: HTTP ${response.code()}", "SUCCESS")
                Result.success("Test berhasil: ${response.code()}")
            } else {
                if (response.code() == 400) { // Check if the error code is 400
                    insertLog("Test berhasil: HTTP 400 (dianggap berhasil)", "SUCCESS")
                    Result.success("Test berhasil: 400 (dianggap berhasil)")
                } else {
                    val error = "Test gagal: HTTP ${response.code()}"
                    insertLog(error, "ERROR")
                    Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending test notification", e)
            insertLog("Test error: ${e.message}", "ERROR")
            Result.failure(e)
        }
    }
    
    private suspend fun queueNotification(payload: NotificationPayload, endpointUrl: String, apiKey: String?) {
        val jsonPayload = gson.toJson(payload)
        val pendingNotification = PendingNotificationEntity(
            jsonPayload = jsonPayload,
            endpointUrl = endpointUrl,
            apiKey = apiKey,
            createdAt = System.currentTimeMillis()
        )
        pendingNotificationDao.insertPending(pendingNotification)
    }
    
    suspend fun getPendingNotifications(): List<PendingNotificationEntity> {
        return pendingNotificationDao.getAllPendingList()
    }
    
    suspend fun retryPendingNotification(pendingNotification: PendingNotificationEntity): Result<String> {
        return try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                return Result.failure(Exception("No network connection"))
            }
            
            val payload = gson.fromJson(pendingNotification.jsonPayload, NotificationPayload::class.java)
            
            val response = apiService.sendNotification(
                url = pendingNotification.endpointUrl,
                apiKey = pendingNotification.apiKey,
                payload = payload
            )
            
            if (response.isSuccessful) {
                // Remove from queue on success
                pendingNotificationDao.deletePending(pendingNotification)
                insertLog("Retry berhasil: ${payload.packageName}", "SUCCESS")
                Result.success("Retry successful")
            } else {
                // Update retry count
                pendingNotificationDao.incrementRetryCount(
                    pendingNotification.id, 
                    "HTTP ${response.code()}: ${response.message()}"
                )
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error retrying notification", e)
            pendingNotificationDao.incrementRetryCount(pendingNotification.id, e.message ?: "Unknown error")
            Result.failure(e)
        }
    }
    
    suspend fun deletePendingNotification(id: Long) {
        pendingNotificationDao.deletePendingById(id)
    }
    
    suspend fun clearAllPendingNotifications() {
        pendingNotificationDao.clearAllPending()
    }
    
    suspend fun getLogsSummaryText(): String {
        val logs = notificationLogDao.getRecentLogs(100)
        val formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")
            .withZone(ZoneId.systemDefault())
        
        return logs.joinToString("\n") { log ->
            val timestamp = formatter.format(Instant.ofEpochMilli(log.timestamp))
            "[$timestamp] [${log.type}] ${log.message}"
        }
    }
}