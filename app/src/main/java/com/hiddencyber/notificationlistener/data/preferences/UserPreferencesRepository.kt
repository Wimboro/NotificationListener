package com.hiddencyber.notificationlistener.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "notification_listener_preferences")

@Singleton
class UserPreferencesRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private object PreferencesKeys {
        val ENDPOINT_URL = stringPreferencesKey("endpoint_url")
        val FILTER_PACKAGES = stringPreferencesKey("filter_packages")
        val FORWARD_ALL_APPS = booleanPreferencesKey("forward_all_apps")
        val SERVICE_ENABLED = booleanPreferencesKey("service_enabled")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val FIRST_LAUNCH = booleanPreferencesKey("first_launch")
        val BATTERY_OPTIMIZATION_SHOWN = booleanPreferencesKey("battery_optimization_shown")
    }
    
    val endpointUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.ENDPOINT_URL] ?: ""
    }
    
    val filterPackages: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.FILTER_PACKAGES] ?: ""
    }
    
    val forwardAllApps: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.FORWARD_ALL_APPS] ?: false
    }
    
    val serviceEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SERVICE_ENABLED] ?: false
    }
    
    val deviceId: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DEVICE_ID] ?: ""
    }
    
    val isFirstLaunch: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.FIRST_LAUNCH] ?: true
    }
    
    val batteryOptimizationShown: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.BATTERY_OPTIMIZATION_SHOWN] ?: false
    }
    
    suspend fun setEndpointUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.ENDPOINT_URL] = url
        }
    }
    
    suspend fun setFilterPackages(packages: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.FILTER_PACKAGES] = packages
        }
    }
    
    suspend fun setForwardAllApps(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.FORWARD_ALL_APPS] = enabled
        }
    }
    
    suspend fun setServiceEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SERVICE_ENABLED] = enabled
        }
    }
    
    suspend fun setDeviceId(deviceId: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.DEVICE_ID] = deviceId
        }
    }
    
    suspend fun setFirstLaunch(isFirst: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.FIRST_LAUNCH] = isFirst
        }
    }
    
    suspend fun setBatteryOptimizationShown(shown: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.BATTERY_OPTIMIZATION_SHOWN] = shown
        }
    }
    
    suspend fun getEndpointUrlSync(): String {
        return endpointUrl.first()
    }
    
    suspend fun getFilterPackagesSync(): String {
        return filterPackages.first()
    }
    
    suspend fun getForwardAllAppsSync(): Boolean {
        return forwardAllApps.first()
    }
    
    suspend fun getDeviceIdSync(): String {
        return deviceId.first()
    }
}