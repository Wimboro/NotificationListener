package com.hiddencyber.notificationlistener.utils

import java.util.regex.Pattern

object NotificationUtils {
    
    private val rupiahPatterns = listOf(
        Pattern.compile("Rp\\s+([0-9]{1,3}(?:\\.[0-9]{3})*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Rp([0-9]{1,3}(?:\\.[0-9]{3})*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Rp\\s+([0-9]{1,3}(?:,[0-9]{3})*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Rp([0-9]{1,3}(?:,[0-9]{3})*)", Pattern.CASE_INSENSITIVE)
    )
    
    fun detectRupiahAmount(vararg texts: String?): String? {
        for (text in texts) {
            if (text.isNullOrBlank()) continue
            for (pattern in rupiahPatterns) {
                val matcher = pattern.matcher(text)
                if (matcher.find()) {
                    // Extract only the numeric part (group 1 contains the number)
                    val numericPart = matcher.group(1)
                    // Remove dots and commas to get clean number
                    return numericPart?.replace("[,.]".toRegex(), "")
                }
            }
        }
        return null
    }
    
    fun isValidUrl(url: String): Boolean {
        if (url.isBlank()) return false
        return url.startsWith("http://") || url.startsWith("https://")
    }
    
    fun parsePackageFilter(packages: String): List<String> {
        if (packages.isBlank()) return emptyList()
        return packages.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }
    
    fun truncateText(text: String?, maxLength: Int = 100): String {
        if (text.isNullOrBlank()) return ""
        return if (text.length <= maxLength) text else "${text.take(maxLength)}..."
    }
}