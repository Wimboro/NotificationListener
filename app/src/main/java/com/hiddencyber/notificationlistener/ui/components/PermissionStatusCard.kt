package com.hiddencyber.notificationlistener.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.hiddencyber.notificationlistener.ui.theme.NotificationListenerTheme

@Composable
fun PermissionStatusCard(
    isGranted: Boolean,
    onCheckStatus: () -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isGranted) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.errorContainer
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = if (isGranted) Icons.Default.CheckCircle else Icons.Default.Warning,
                    contentDescription = null,
                    tint = if (isGranted) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onErrorContainer
                    }
                )
                
                Text(
                    text = "Izin Akses Notifikasi: ${if (isGranted) "Granted" else "Not Granted"}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                    color = if (isGranted) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onErrorContainer
                    }
                )
            }
            
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onCheckStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Cek Status Izin")
                }
                
                OutlinedButton(
                    onClick = onOpenSettings,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Settings, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Buka Pengaturan Akses Notifikasi")
                }
            }
        }
    }
}

@Preview(showBackground = true, name = "Permission Granted")
@Composable
fun PermissionStatusCardPreviewGranted() {
    NotificationListenerTheme {
        PermissionStatusCard(
            isGranted = true,
            onCheckStatus = {},
            onOpenSettings = {}
        )
    }
}

@Preview(showBackground = true, name = "Permission Denied")
@Composable
fun PermissionStatusCardPreviewDenied() {
    NotificationListenerTheme {
        PermissionStatusCard(
            isGranted = false,
            onCheckStatus = {},
            onOpenSettings = {}
        )
    }
}

@Preview(showBackground = true, name = "Permission Granted - Dark")
@Composable
fun PermissionStatusCardPreviewGrantedDark() {
    NotificationListenerTheme(darkTheme = true) {
        PermissionStatusCard(
            isGranted = true,
            onCheckStatus = {},
            onOpenSettings = {}
        )
    }
}