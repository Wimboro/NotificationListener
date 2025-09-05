package com.hiddencyber.notificationlistener.data.network

import com.hiddencyber.notificationlistener.data.model.ApiResponse
import com.hiddencyber.notificationlistener.data.model.NotificationPayload
import com.hiddencyber.notificationlistener.data.model.TestPayload
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Url

interface NotificationApiService {
    
    @POST
    suspend fun sendNotification(
        @Url url: String,
        @Header("Content-Type") contentType: String = "application/json",
        @Header("X-API-Key") apiKey: String? = null,
        @Body payload: NotificationPayload
    ): Response<ApiResponse>
    
    @POST
    suspend fun sendTestNotification(
        @Url url: String,
        @Header("Content-Type") contentType: String = "application/json",
        @Header("X-API-Key") apiKey: String? = null,
        @Body payload: TestPayload
    ): Response<ApiResponse>
    
    @POST
    suspend fun sendRawJson(
        @Url url: String,
        @Header("Content-Type") contentType: String = "application/json",
        @Header("X-API-Key") apiKey: String? = null,
        @Body payload: String
    ): Response<Any>
}