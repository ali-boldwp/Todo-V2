package com.devmanager.plugin.services

class ApiException(
    val statusCode: Int,
    val code: String? = null,
    val serverMessage: String? = null,
    val rawBody: String? = null,
) : RuntimeException(serverMessage ?: rawBody ?: "API error")

