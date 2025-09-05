package com.hiddencyber.notificationlistener.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.hiddencyber.notificationlistener.data.repository.NotificationRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

@HiltWorker
class NotificationRetryWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val notificationRepository: NotificationRepository
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        private const val TAG = "NotificationRetryWorker"
        const val WORK_NAME = "notification_retry_work"
        private const val MAX_RETRY_ATTEMPTS = 5
        
        fun scheduleRetryWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val retryRequest = OneTimeWorkRequestBuilder<NotificationRetryWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    retryRequest
                )
        }
        
        fun schedulePeriodicRetryWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val periodicRetryRequest = PeriodicWorkRequestBuilder<NotificationRetryWorker>(
                15, TimeUnit.MINUTES // Check every 15 minutes
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    "${WORK_NAME}_periodic",
                    ExistingPeriodicWorkPolicy.KEEP,
                    periodicRetryRequest
                )
        }
        
        fun cancelRetryWork(context: Context) {
            WorkManager.getInstance(context)
                .cancelUniqueWork(WORK_NAME)
            WorkManager.getInstance(context)
                .cancelUniqueWork("${WORK_NAME}_periodic")
        }
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Starting notification retry work")
            
            val pendingNotifications = notificationRepository.getPendingNotifications()
            
            if (pendingNotifications.isEmpty()) {
                Log.d(TAG, "No pending notifications to retry")
                return@withContext Result.success()
            }
            
            Log.d(TAG, "Found ${pendingNotifications.size} pending notifications to retry")
            
            var successCount = 0
            var failureCount = 0
            
            for (pendingNotification in pendingNotifications) {
                // Skip notifications that have exceeded max retry attempts
                if (pendingNotification.retryCount >= MAX_RETRY_ATTEMPTS) {
                    Log.w(TAG, "Skipping notification ${pendingNotification.id} - max retries exceeded")
                    // Delete the notification that exceeded max retries
                    notificationRepository.deletePendingNotification(pendingNotification.id)
                    continue
                }
                
                try {
                    val result = notificationRepository.retryPendingNotification(pendingNotification)
                    
                    if (result.isSuccess) {
                        successCount++
                        Log.d(TAG, "Successfully retried notification ${pendingNotification.id}")
                    } else {
                        failureCount++
                        Log.w(TAG, "Failed to retry notification ${pendingNotification.id}: ${result.exceptionOrNull()?.message}")
                    }
                } catch (e: Exception) {
                    failureCount++
                    Log.e(TAG, "Error retrying notification ${pendingNotification.id}", e)
                }
            }
            
            Log.d(TAG, "Retry work completed. Success: $successCount, Failures: $failureCount")
            
            // If there are still pending notifications with failures, schedule another retry
            if (failureCount > 0) {
                scheduleRetryWork(applicationContext)
            }
            
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Error in notification retry work", e)
            Result.retry()
        }
    }
}