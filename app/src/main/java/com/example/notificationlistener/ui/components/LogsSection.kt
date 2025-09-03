package com.example.notificationlistener.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.notificationlistener.data.database.entity.NotificationLogEntity
import com.example.notificationlistener.ui.theme.NotificationListenerTheme
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun LogsSection(
    logs: List<NotificationLogEntity>,
    onClearLogs: () -> Unit,
    onShareLogs: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Logs (max 100 terakhir):",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onShareLogs,
                        modifier = Modifier.size(40.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Bagikan Log",
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    
                    OutlinedButton(
                        onClick = onClearLogs,
                        modifier = Modifier.size(40.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(
                            Icons.Default.Clear,
                            contentDescription = "Bersihkan Log",
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                if (logs.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Belum ada log",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        reverseLayout = true
                    ) {
                        items(logs) { log ->
                            LogItem(log = log)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LogItem(
    log: NotificationLogEntity,
    modifier: Modifier = Modifier
) {
    val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    val time = dateFormat.format(Date(log.timestamp))
    
    val backgroundColor = when (log.type) {
        "SUCCESS" -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        "ERROR" -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        "INFO" -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        "QUEUED" -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
        else -> MaterialTheme.colorScheme.surface
    }
    
    val textColor = when (log.type) {
        "SUCCESS" -> MaterialTheme.colorScheme.onPrimaryContainer
        "ERROR" -> MaterialTheme.colorScheme.onErrorContainer
        "INFO" -> MaterialTheme.colorScheme.onSurfaceVariant
        "QUEUED" -> MaterialTheme.colorScheme.onSecondaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }
    
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = time,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = textColor.copy(alpha = 0.7f)
        )
        
        Text(
            text = log.message,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = textColor,
            modifier = Modifier.weight(1f)
        )
    }
}

@Preview(showBackground = true, name = "Logs Section - Empty")
@Composable
fun LogsSectionPreviewEmpty() {
    NotificationListenerTheme {
        LogsSection(
            logs = emptyList(),
            onClearLogs = {},
            onShareLogs = {}
        )
    }
}

@Preview(showBackground = true, name = "Logs Section - With Logs")
@Composable
fun LogsSectionPreviewWithLogs() {
    NotificationListenerTheme {
        LogsSection(
            logs = listOf(
                NotificationLogEntity(
                    id = 1,
                    timestamp = System.currentTimeMillis(),
                    message = "SUCCESS: Notification sent successfully to webhook",
                    type = "SUCCESS"
                ),
                NotificationLogEntity(
                    id = 2,
                    timestamp = System.currentTimeMillis() - 60000,
                    message = "ERROR: Failed to send notification - connection timeout",
                    type = "ERROR"
                ),
                NotificationLogEntity(
                    id = 3,
                    timestamp = System.currentTimeMillis() - 120000,
                    message = "INFO: Service started and listening for notifications",
                    type = "INFO"
                ),
                NotificationLogEntity(
                    id = 4,
                    timestamp = System.currentTimeMillis() - 180000,
                    message = "QUEUED: Notification added to retry queue",
                    type = "QUEUED"
                )
            ),
            onClearLogs = {},
            onShareLogs = {}
        )
    }
}

@Preview(showBackground = true, name = "Log Item - Success")
@Composable
fun LogItemPreviewSuccess() {
    NotificationListenerTheme {
        LogItem(
            log = NotificationLogEntity(
                id = 1,
                timestamp = System.currentTimeMillis(),
                message = "SUCCESS: Notification sent successfully",
                type = "SUCCESS"
            )
        )
    }
}

@Preview(showBackground = true, name = "Log Item - Error")
@Composable
fun LogItemPreviewError() {
    NotificationListenerTheme {
        LogItem(
            log = NotificationLogEntity(
                id = 2,
                timestamp = System.currentTimeMillis(),
                message = "ERROR: Failed to send notification - network error",
                type = "ERROR"
            )
        )
    }
}