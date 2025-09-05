package com.hiddencyber.notificationlistener.data.database

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import android.content.Context
import com.hiddencyber.notificationlistener.data.database.dao.NotificationLogDao
import com.hiddencyber.notificationlistener.data.database.dao.PendingNotificationDao
import com.hiddencyber.notificationlistener.data.database.entity.NotificationLogEntity
import com.hiddencyber.notificationlistener.data.database.entity.PendingNotificationEntity

@Database(
    entities = [
        NotificationLogEntity::class,
        PendingNotificationEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class NotificationDatabase : RoomDatabase() {
    
    abstract fun notificationLogDao(): NotificationLogDao
    abstract fun pendingNotificationDao(): PendingNotificationDao
    
    companion object {
        const val DATABASE_NAME = "notification_listener_db"
        
        @Volatile
        private var INSTANCE: NotificationDatabase? = null
        
        fun getDatabase(context: Context): NotificationDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    NotificationDatabase::class.java,
                    DATABASE_NAME
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}