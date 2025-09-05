package com.hiddencyber.notificationlistener.ui.state

import com.hiddencyber.notificationlistener.data.database.entity.NotificationLogEntity

data class NotificationListenerUiState(
    val isLoading: Boolean = false,
    val isNotificationAccessGranted: Boolean = false,
    val endpointUrl: String = "",
    val apiKey: String = "",
    val filterPackages: String = "",
    val forwardAllApps: Boolean = false,
    val serviceEnabled: Boolean = false,
    val logs: List<NotificationLogEntity> = emptyList(),
    val isApiKeyVisible: Boolean = false,
    val validationErrors: ValidationErrors = ValidationErrors(),
    val showBatteryOptimizationDialog: Boolean = false,
    val batteryOptimizationShown: Boolean = false
)

data class ValidationErrors(
    val endpointUrl: String? = null,
    val apiKey: String? = null,
    val filterPackages: String? = null
)

sealed class UiEvent {
    object CheckPermissionStatus : UiEvent()
    object OpenNotificationSettings : UiEvent()
    data class UpdateEndpointUrl(val url: String) : UiEvent()
    data class UpdateApiKey(val key: String) : UiEvent()
    data class UpdateFilterPackages(val packages: String) : UiEvent()
    data class UpdateForwardAllApps(val enabled: Boolean) : UiEvent()
    object ToggleApiKeyVisibility : UiEvent()
    object SaveSettings : UiEvent()
    object ClearLogs : UiEvent()
    object ShareLogs : UiEvent()
    object TestSend : UiEvent()
    object CopySettings : UiEvent()
    object DismissBatteryOptimizationDialog : UiEvent()
    object OpenBatteryOptimizationSettings : UiEvent()
}