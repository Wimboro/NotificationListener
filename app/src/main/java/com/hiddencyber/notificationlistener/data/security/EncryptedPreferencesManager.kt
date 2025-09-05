package com.hiddencyber.notificationlistener.data.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EncryptedPreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private const val FILE_NAME = "encrypted_notification_listener_prefs"
        private const val API_KEY_PREF = "api_key"
    }
    
    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }
    
    private val encryptedSharedPreferences: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
    
    fun saveApiKey(apiKey: String?) {
        encryptedSharedPreferences.edit()
            .putString(API_KEY_PREF, apiKey)
            .apply()
    }
    
    fun getApiKey(): String? {
        return encryptedSharedPreferences.getString(API_KEY_PREF, null)
    }
    
    fun clearApiKey() {
        encryptedSharedPreferences.edit()
            .remove(API_KEY_PREF)
            .apply()
    }
    
    fun hasApiKey(): Boolean {
        return !getApiKey().isNullOrEmpty()
    }
}