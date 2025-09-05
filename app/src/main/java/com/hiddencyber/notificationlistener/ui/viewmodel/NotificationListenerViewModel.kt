package com.hiddencyber.notificationlistener.ui.viewmodel

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hiddencyber.notificationlistener.data.preferences.UserPreferencesRepository
import com.hiddencyber.notificationlistener.data.repository.NotificationRepository
import com.hiddencyber.notificationlistener.data.security.EncryptedPreferencesManager
import com.hiddencyber.notificationlistener.service.ForegroundService
import com.hiddencyber.notificationlistener.service.NotificationCaptureService
import com.hiddencyber.notificationlistener.ui.state.NotificationListenerUiState
import com.hiddencyber.notificationlistener.ui.state.UiEvent
import com.hiddencyber.notificationlistener.ui.state.ValidationErrors
import com.hiddencyber.notificationlistener.utils.NotificationUtils
import com.hiddencyber.notificationlistener.worker.NotificationRetryWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*
import javax.inject.Inject

@HiltViewModel
class NotificationListenerViewModel @Inject constructor(
    application: Application,
    private val notificationRepository: NotificationRepository,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val encryptedPreferencesManager: EncryptedPreferencesManager
) : AndroidViewModel(application) {
    
    companion object {
        private const val TAG = "NotificationListenerViewModel"
    }
    
    private val context: Context = application.applicationContext
    
    private val _uiState = MutableStateFlow(NotificationListenerUiState())
    val uiState: StateFlow<NotificationListenerUiState> = _uiState.asStateFlow()
    
    init {
        observePreferences()
        observeLogs()
        checkInitialState()
    }
    
    private fun observePreferences() {
        viewModelScope.launch {
            combine(
                userPreferencesRepository.endpointUrl,
                userPreferencesRepository.filterPackages,
                userPreferencesRepository.forwardAllApps,
                userPreferencesRepository.serviceEnabled,
                userPreferencesRepository.batteryOptimizationShown
            ) { endpointUrl, filterPackages, forwardAllApps, serviceEnabled, batteryOptimizationShown ->
                _uiState.value = _uiState.value.copy(
                    endpointUrl = endpointUrl,
                    filterPackages = filterPackages,
                    forwardAllApps = forwardAllApps,
                    serviceEnabled = serviceEnabled,
                    batteryOptimizationShown = batteryOptimizationShown,
                    apiKey = encryptedPreferencesManager.getApiKey() ?: ""
                )
            }.collect()
        }
    }
    
    private fun observeLogs() {
        viewModelScope.launch {
            notificationRepository.getAllLogs().collect { logs ->
                _uiState.value = _uiState.value.copy(logs = logs)
            }
        }
    }
    
    private fun checkInitialState() {
        viewModelScope.launch {
            checkPermissionStatus()
            
            // Generate device ID if needed
            val deviceId = userPreferencesRepository.getDeviceIdSync()
            if (deviceId.isEmpty()) {
                val newDeviceId = UUID.randomUUID().toString()
                userPreferencesRepository.setDeviceId(newDeviceId)
                notificationRepository.insertLog("Device ID dibuat: ${newDeviceId.take(8)}...", "INFO")
            }
        }
    }
    
    fun handleEvent(event: UiEvent) {
        when (event) {
            is UiEvent.CheckPermissionStatus -> checkPermissionStatus()
            is UiEvent.OpenNotificationSettings -> openNotificationSettings()
            is UiEvent.UpdateEndpointUrl -> updateEndpointUrl(event.url)
            is UiEvent.UpdateApiKey -> updateApiKey(event.key)
            is UiEvent.UpdateFilterPackages -> updateFilterPackages(event.packages)
            is UiEvent.UpdateForwardAllApps -> updateForwardAllApps(event.enabled)
            is UiEvent.ToggleApiKeyVisibility -> toggleApiKeyVisibility()
            is UiEvent.SaveSettings -> saveSettings()
            is UiEvent.ClearLogs -> clearLogs()
            is UiEvent.ShareLogs -> shareLogs()
            is UiEvent.TestSend -> testSend()
            is UiEvent.CopySettings -> copySettings()
            is UiEvent.DismissBatteryOptimizationDialog -> dismissBatteryOptimizationDialog()
            is UiEvent.OpenBatteryOptimizationSettings -> openBatteryOptimizationSettings()
        }
    }
    
    private fun checkPermissionStatus() {
        val isGranted = NotificationCaptureService.isNotificationAccessGranted(
            context, 
            context.packageName
        )
        _uiState.value = _uiState.value.copy(isNotificationAccessGranted = isGranted)
        
        val status = if (isGranted) "Granted" else "Not Granted"
        viewModelScope.launch {
            notificationRepository.insertLog("Status izin akses notifikasi: $status", "INFO")
        }
    }
    
    private fun openNotificationSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }
    
    private fun updateEndpointUrl(url: String) {
        _uiState.value = _uiState.value.copy(
            endpointUrl = url,
            validationErrors = _uiState.value.validationErrors.copy(endpointUrl = null)
        )
    }
    
    private fun updateApiKey(key: String) {
        _uiState.value = _uiState.value.copy(
            apiKey = key,
            validationErrors = _uiState.value.validationErrors.copy(apiKey = null)
        )
    }
    
    private fun updateFilterPackages(packages: String) {
        _uiState.value = _uiState.value.copy(
            filterPackages = packages,
            validationErrors = _uiState.value.validationErrors.copy(filterPackages = null)
        )
    }
    
    private fun updateForwardAllApps(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(forwardAllApps = enabled)
    }
    
    private fun toggleApiKeyVisibility() {
        _uiState.value = _uiState.value.copy(isApiKeyVisible = !_uiState.value.isApiKeyVisible)
    }
    
    private fun saveSettings() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true)
                
                val validationErrors = validateSettings()
                if (validationErrors.hasErrors()) {
                    _uiState.value = _uiState.value.copy(
                        validationErrors = validationErrors,
                        isLoading = false
                    )
                    return@launch
                }
                
                // Save settings
                val currentState = _uiState.value
                userPreferencesRepository.setEndpointUrl(currentState.endpointUrl)
                userPreferencesRepository.setFilterPackages(currentState.filterPackages)
                userPreferencesRepository.setForwardAllApps(currentState.forwardAllApps)
                userPreferencesRepository.setServiceEnabled(true)
                
                encryptedPreferencesManager.saveApiKey(
                    if (currentState.apiKey.isBlank()) null else currentState.apiKey
                )
                
                // Start services if permission is granted
                if (currentState.isNotificationAccessGranted) {
                    ForegroundService.startService(context)
                    NotificationRetryWorker.schedulePeriodicRetryWork(context)
                    
                    // Show battery optimization dialog if first successful save
                    if (!currentState.batteryOptimizationShown && !isIgnoringBatteryOptimizations()) {
                        _uiState.value = _uiState.value.copy(showBatteryOptimizationDialog = true)
                    }
                }
                
                notificationRepository.insertLog("Pengaturan berhasil disimpan", "SUCCESS")
                
            } catch (e: Exception) {
                Log.e(TAG, "Error saving settings", e)
                notificationRepository.insertLog("Error menyimpan pengaturan: ${e.message}", "ERROR")
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }
    
    private fun validateSettings(): ValidationErrors {
        val currentState = _uiState.value
        var errors = ValidationErrors()
        
        if (currentState.endpointUrl.isBlank()) {
            errors = errors.copy(endpointUrl = "Endpoint URL wajib diisi")
        } else if (!NotificationUtils.isValidUrl(currentState.endpointUrl)) {
            errors = errors.copy(endpointUrl = "URL tidak valid")
        }
        
        if (!currentState.forwardAllApps && currentState.filterPackages.isBlank()) {
            errors = errors.copy(filterPackages = "Filter package wajib diisi")
        }
        
        return errors
    }
    
    private fun clearLogs() {
        viewModelScope.launch {
            notificationRepository.clearAllLogs()
        }
    }
    
    private fun shareLogs() {
        viewModelScope.launch {
            try {
                val logText = notificationRepository.getLogsSummaryText()
                val shareIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, logText)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(Intent.createChooser(shareIntent, "Share Logs"))
            } catch (e: Exception) {
                notificationRepository.insertLog("Error berbagi logs: ${e.message}", "ERROR")
            }
        }
    }
    
    private fun testSend() {
        viewModelScope.launch {
            try {
                val result = notificationRepository.sendTestNotification()
                if (result.isSuccess) {
                    notificationRepository.insertLog("Test berhasil", "SUCCESS")
                } else {
                    notificationRepository.insertLog("Test gagal", "ERROR")
                }
            } catch (e: Exception) {
                notificationRepository.insertLog("Error test: ${e.message}", "ERROR")
            }
        }
    }
    
    private fun copySettings() {
        try {
            val currentState = _uiState.value
            val settingsText = "Endpoint: ${currentState.endpointUrl}\nPackages: ${currentState.filterPackages}"
            
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Settings", settingsText)
            clipboard.setPrimaryClip(clip)
            
            viewModelScope.launch {
                notificationRepository.insertLog("Pengaturan disalin", "INFO")
            }
        } catch (e: Exception) {
            viewModelScope.launch {
                notificationRepository.insertLog("Error menyalin: ${e.message}", "ERROR")
            }
        }
    }
    
    private fun dismissBatteryOptimizationDialog() {
        _uiState.value = _uiState.value.copy(showBatteryOptimizationDialog = false)
        viewModelScope.launch {
            userPreferencesRepository.setBatteryOptimizationShown(true)
        }
    }
    
    private fun openBatteryOptimizationSettings() {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            dismissBatteryOptimizationDialog()
        } catch (e: Exception) {
            dismissBatteryOptimizationDialog()
        }
    }
    
    private fun isIgnoringBatteryOptimizations(): Boolean {
        return try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } catch (e: Exception) {
            false
        }
    }
}

private fun ValidationErrors.hasErrors(): Boolean {
    return endpointUrl != null || apiKey != null || filterPackages != null
}
