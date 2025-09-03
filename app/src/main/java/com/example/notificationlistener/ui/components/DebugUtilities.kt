package com.example.notificationlistener.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.notificationlistener.ui.theme.NotificationListenerTheme

@Composable
fun DebugUtilities(
    onTestSend: () -> Unit,
    onCopySettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Debug Utilities",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onTestSend,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Uji Kirim")
                }
                
                OutlinedButton(
                    onClick = onCopySettings,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Salin Pengaturan")
                }
            }
        }
    }
}

@Preview(showBackground = true, name = "Debug Utilities")
@Composable
fun DebugUtilitiesPreview() {
    NotificationListenerTheme {
        DebugUtilities(
            onTestSend = {},
            onCopySettings = {}
        )
    }
}

@Preview(showBackground = true, name = "Debug Utilities - Dark")
@Composable
fun DebugUtilitiesPreviewDark() {
    NotificationListenerTheme(darkTheme = true) {
        DebugUtilities(
            onTestSend = {},
            onCopySettings = {}
        )
    }
}