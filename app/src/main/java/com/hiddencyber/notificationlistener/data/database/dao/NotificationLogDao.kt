package com.hiddencyber.notificationlistener.data.database.dao

import androidx.room.*
import com.hiddencyber.notificationlistener.data.database.entity.NotificationLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationLogDao {
    
    @Query("SELECT * FROM notification_logs ORDER BY timestamp DESC LIMIT 100")
    fun getAllLogs(): Flow<List<NotificationLogEntity>>
    
    @Query("SELECT * FROM notification_logs ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentLogs(limit: Int = 100): List<NotificationLogEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: NotificationLogEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLogs(logs: List<NotificationLogEntity>)
    
    @Query("DELETE FROM notification_logs WHERE id NOT IN (SELECT id FROM notification_logs ORDER BY timestamp DESC LIMIT 100)")
    suspend fun deleteOldLogs()
    
    @Query("DELETE FROM notification_logs")
    suspend fun clearAllLogs()
    
    @Query("SELECT COUNT(*) FROM notification_logs")
    suspend fun getLogCount(): Int
}