package com.devmanager.plugin.services

import com.devmanager.plugin.model.LoginResponse
import com.devmanager.plugin.model.ProjectItem
import com.devmanager.plugin.model.TaskItem
import com.devmanager.plugin.model.TaskLogsResponse
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets

@Service(Service.Level.PROJECT)
class TaskApiService(project: Project) {
    private val auth = project.getService(AuthService::class.java)
    private val http = HttpClient.newHttpClient()
    private val gson = Gson()

    fun login(email: String, password: String): LoginResponse {
        val base = auth.getBaseUrl().trimEnd('/')
        val payload = gson.toJson(mapOf("email" to email.trim(), "password" to password))
        val body = request("POST", "$base/auth/login", payload, requireAuth = false)
        return gson.fromJson(body, LoginResponse::class.java)
    }

    fun exchangeIdeCode(code: String, state: String? = null): LoginResponse {
        val base = auth.getBaseUrl().trimEnd('/')
        val payload = gson.toJson(
            mapOf(
                "code" to code,
                "state" to (state ?: "")
            )
        )
        val body = request("POST", "$base/auth/ide/exchange", payload, requireAuth = false)
        return gson.fromJson(body, LoginResponse::class.java)
    }

    fun fetchProjects(): List<ProjectItem> {
        val base = auth.getBaseUrl().trimEnd('/')
        val body = request("GET", "$base/projects")
        val type = object : TypeToken<List<ProjectItem>>() {}.type
        return gson.fromJson(body, type) ?: emptyList()
    }

    fun fetchTasks(projectId: String? = null): List<TaskItem> {
        val base = auth.getBaseUrl().trimEnd('/')
        val query = if (!projectId.isNullOrBlank()) {
            "?projectId=${URLEncoder.encode(projectId, StandardCharsets.UTF_8)}"
        } else {
            ""
        }
        val body = request("GET", "$base/tasks$query")
        val type = object : TypeToken<List<TaskItem>>() {}.type
        return gson.fromJson(body, type) ?: emptyList()
    }

    fun fetchTaskLogs(taskId: String): TaskLogsResponse {
        val base = auth.getBaseUrl().trimEnd('/')
        val body = request("GET", "$base/tasks/$taskId/logs")
        return gson.fromJson(body, TaskLogsResponse::class.java) ?: TaskLogsResponse()
    }

    fun postTaskAction(taskId: String, actionPath: String, payloadJson: String? = null) {
        val base = auth.getBaseUrl().trimEnd('/')
        request("POST", "$base/tasks/$taskId/$actionPath", payloadJson)
    }

    private fun request(method: String, url: String, body: String? = null, requireAuth: Boolean = true): String {
        val token = auth.getToken().trim()
        if (requireAuth) {
            require(token.isNotBlank()) { "Missing auth token. Set it in DevManager panel." }
        }

        val builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/json")
        if (token.isNotBlank()) {
            builder.header("Authorization", "Bearer $token")
        }

        val request = when (method.uppercase()) {
            "POST" -> builder
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body ?: "{}"))
                .build()
            "PATCH" -> builder
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body ?: "{}"))
                .build()
            else -> builder.GET().build()
        }

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            val parsed = runCatching { JsonParser.parseString(response.body()).asJsonObject }.getOrNull()
            throw ApiException(
                statusCode = response.statusCode(),
                code = parsed?.getAsStringOrNull("code"),
                serverMessage = parsed?.getAsStringOrNull("message"),
                rawBody = response.body()
            )
        }
        return response.body()
    }

    private fun JsonObject.getAsStringOrNull(key: String): String? {
        if (!has(key) || get(key).isJsonNull) return null
        return runCatching { get(key).asString }.getOrNull()
    }
}
