package com.hiddencyber.notificationlistener.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiddencyber.notificationlistener.data.database.entity.NotificationLogEntity
import com.hiddencyber.notificationlistener.ui.components.DebugUtilities
import com.hiddencyber.notificationlistener.ui.components.LogsSection
import com.hiddencyber.notificationlistener.ui.components.PermissionStatusCard
import com.hiddencyber.notificationlistener.ui.components.SettingsForm
import com.hiddencyber.notificationlistener.ui.state.NotificationListenerUiState
import com.hiddencyber.notificationlistener.ui.state.UiEvent
import com.hiddencyber.notificationlistener.ui.state.ValidationErrors
import com.hiddencyber.notificationlistener.ui.theme.NotificationListenerTheme
import com.hiddencyber.notificationlistener.ui.viewmodel.NotificationListenerViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationListenerScreen(
    modifier: Modifier = Modifier,
    viewModel: NotificationListenerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    
    NotificationListenerScreenContent(
        uiState = uiState,
        onEvent = viewModel::handleEvent,
        modifier = modifier
    )
}

// Preview with permission granted
@Preview(showBackground = true, name = "Permission Granted")
@Composable
fun NotificationListenerScreenPreviewGranted() {
    NotificationListenerTheme {
        NotificationListenerScreenContent(
            uiState = NotificationListenerUiState(
                isNotificationAccessGranted = true,
                endpointUrl = "https://api.example.com/webhook",
                apiKey = "sample-api-key",
                filterPackages = "id.dana, com.whatsapp",
                forwardAllApps = false,
                logs = listOf(
                    NotificationLogEntity(
                        id = 1,
                        timestamp = System.currentTimeMillis(),
                        message = "SUCCESS: Notification sent successfully",
                        type = "SUCCESS"
                    ),
                    NotificationLogEntity(
                        id = 2,
                        timestamp = System.currentTimeMillis() - 60000,
                        message = "INFO: Service started",
                        type = "INFO"
                    )
                ),
                isLoading = false,
                validationErrors = ValidationErrors(),
                showBatteryOptimizationDialog = false,
                isApiKeyVisible = false
            ),
            onEvent = {}
        )
    }
}

// Preview with permission denied
@Preview(showBackground = true, name = "Permission Denied")
@Composable
fun NotificationListenerScreenPreviewDenied() {
    NotificationListenerTheme {
        NotificationListenerScreenContent(
            uiState = NotificationListenerUiState(
                isNotificationAccessGranted = false,
                endpointUrl = "",
                apiKey = "",
                filterPackages = "",
                forwardAllApps = false,
                logs = emptyList(),
                isLoading = false,
                validationErrors = ValidationErrors(),
                showBatteryOptimizationDialog = false,
                isApiKeyVisible = false
            ),
            onEvent = {}
        )
    }
}

// Dark theme preview
@Preview(showBackground = true, name = "Dark Theme")
@Composable
fun NotificationListenerScreenPreviewDark() {
    NotificationListenerTheme(darkTheme = true) {
        NotificationListenerScreenContent(
            uiState = NotificationListenerUiState(
                isNotificationAccessGranted = true,
                endpointUrl = "https://api.example.com/webhook",
                apiKey = "sample-api-key",
                filterPackages = "id.dana, com.whatsapp",
                forwardAllApps = true,
                logs = listOf(
                    NotificationLogEntity(
                        id = 1,
                        timestamp = System.currentTimeMillis(),
                        message = "ERROR: Failed to send notification",
                        type = "ERROR"
                    )
                ),
                isLoading = true,
                validationErrors = ValidationErrors(),
                showBatteryOptimizationDialog = false,
                isApiKeyVisible = true
            ),
            onEvent = {}
        )
    }
}

@Composable
fun NotificationListenerScreenContent(
    uiState: NotificationListenerUiState,
    onEvent: (UiEvent) -> Unit,
    modifier: Modifier = Modifier
) {
    // Battery optimization dialog
    if (uiState.showBatteryOptimizationDialog) {
        AlertDialog(
            onDismissRequest = { onEvent(UiEvent.DismissBatteryOptimizationDialog) },
            title = { Text("Optimasi Baterai") },
            text = { 
                Text("Untuk menjaga layanan tetap aktif, disarankan untuk menonaktifkan optimasi baterai untuk aplikasi ini.")
            },
            confirmButton = {
                TextButton(
                    onClick = { onEvent(UiEvent.OpenBatteryOptimizationSettings) }
                ) {
                    Text("Buka Pengaturan")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { onEvent(UiEvent.DismissBatteryOptimizationDialog) }
                ) {
                    Text("Nanti")
                }
            }
        )
    }
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(15.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(15.dp)
    ) {
        // Title
        //Text(
        //    text = "Notification Listener",
        //    style = MaterialTheme.typography.headlineMedium,
        //    fontWeight = FontWeight.Bold,
        //    textAlign = TextAlign.Center,
        //    modifier = Modifier.fillMaxWidth()
        //)
        
        // Permission Status
        PermissionStatusCard(
            isGranted = uiState.isNotificationAccessGranted,
            onCheckStatus = { onEvent(UiEvent.CheckPermissionStatus) },
            onOpenSettings = { onEvent(UiEvent.OpenNotificationSettings) }
        )
        
        // Settings Form
        SettingsForm(
            uiState = uiState,
            onEvent = onEvent
        )
        
        // Logs Section
        LogsSection(
            logs = uiState.logs,
            onClearLogs = { onEvent(UiEvent.ClearLogs) },
            onShareLogs = { onEvent(UiEvent.ShareLogs) }
        )
        
        // Debug Utilities
        DebugUtilities(
            onTestSend = { onEvent(UiEvent.TestSend) },
            onCopySettings = { onEvent(UiEvent.CopySettings) }
        )
    }
}