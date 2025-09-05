package com.hiddencyber.notificationlistener.di

import android.content.Context
import androidx.room.Room
import com.hiddencyber.notificationlistener.data.database.NotificationDatabase
import com.hiddencyber.notificationlistener.data.database.dao.NotificationLogDao
import com.hiddencyber.notificationlistener.data.database.dao.PendingNotificationDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideNotificationDatabase(@ApplicationContext context: Context): NotificationDatabase {
        return Room.databaseBuilder(
            context.applicationContext,
            NotificationDatabase::class.java,
            NotificationDatabase.DATABASE_NAME
        )
        .fallbackToDestructiveMigration()
        .build()
    }
    
    @Provides
    fun provideNotificationLogDao(database: NotificationDatabase): NotificationLogDao {
        return database.notificationLogDao()
    }
    
    @Provides
    fun providePendingNotificationDao(database: NotificationDatabase): PendingNotificationDao {
        return database.pendingNotificationDao()
    }
}