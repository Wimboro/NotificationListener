package com.hiddencyber.notificationlistener.data.database.dao

import androidx.room.*
import com.hiddencyber.notificationlistener.data.database.entity.PendingNotificationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingNotificationDao {
    
    @Query("SELECT * FROM pending_notifications ORDER BY created_at ASC")
    fun getAllPending(): Flow<List<PendingNotificationEntity>>
    
    @Query("SELECT * FROM pending_notifications ORDER BY created_at ASC")
    suspend fun getAllPendingList(): List<PendingNotificationEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPending(notification: PendingNotificationEntity): Long
    
    @Update
    suspend fun updatePending(notification: PendingNotificationEntity)
    
    @Delete
    suspend fun deletePending(notification: PendingNotificationEntity)
    
    @Query("DELETE FROM pending_notifications WHERE id = :id")
    suspend fun deletePendingById(id: Long)
    
    @Query("DELETE FROM pending_notifications")
    suspend fun clearAllPending()
    
    @Query("SELECT COUNT(*) FROM pending_notifications")
    suspend fun getPendingCount(): Int
    
    @Query("UPDATE pending_notifications SET retry_count = retry_count + 1, last_error = :error WHERE id = :id")
    suspend fun incrementRetryCount(id: Long, error: String)
}