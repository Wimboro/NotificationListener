package com.hiddencyber.notificationlistener.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.hiddencyber.notificationlistener.service.ForegroundService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class BootCompletedReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootCompletedReceiver"
    }
    
    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received broadcast: ${intent.action}")
        
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.PACKAGE_REPLACED" -> {
                handleBootCompleted(context, intent)
            }
        }
    }
    
    private fun handleBootCompleted(context: Context, intent: Intent) {
        applicationScope.launch {
            try {
                Log.d(TAG, "Handling boot completed or package replaced")
                
                // Start foreground service - it will check permissions internally
                ForegroundService.startService(context)
                
            } catch (e: Exception) {
                Log.e(TAG, "Error handling boot completed", e)
            }
        }
    }
}