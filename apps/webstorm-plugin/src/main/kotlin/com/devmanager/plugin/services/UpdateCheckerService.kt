package com.devmanager.plugin.services

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.ide.BrowserUtil
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.extensions.PluginId
import com.intellij.util.concurrency.AppExecutorUtil
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

@Service(Service.Level.PROJECT)
class UpdateCheckerService(private val project: Project) {
    private val auth = project.getService(AuthService::class.java)
    private val props = PropertiesComponent.getInstance(project)
    private val http = HttpClient.newHttpClient()
    private val started = AtomicBoolean(false)
    private var periodicTask: ScheduledFuture<*>? = null

    fun start() {
        if (!started.compareAndSet(false, true)) return

        checkNow(manual = false)
        periodicTask = AppExecutorUtil.getAppScheduledExecutorService().scheduleWithFixedDelay(
            { checkNow(manual = false) },
            PERIODIC_CHECK_HOURS,
            PERIODIC_CHECK_HOURS,
            TimeUnit.HOURS
        )

        Disposer.register(project) {
            periodicTask?.cancel(true)
        }
    }

    fun checkNow(manual: Boolean) {
        if (!manual) {
            val lastCheckedAt = props.getLong(LAST_CHECKED_AT_KEY, 0L)
            val elapsedMs = System.currentTimeMillis() - lastCheckedAt
            if (elapsedMs in 0 until MIN_AUTO_CHECK_INTERVAL_MS) return
        }

        ApplicationManager.getApplication().executeOnPooledThread {
            runCatching { checkNowInternal(manual) }
                .onFailure { error ->
                    if (manual) {
                        notifyCheckFailed(error.message ?: "Unable to reach update channel.")
                    }
                }
        }
    }

    private fun checkNowInternal(manual: Boolean) {
        val currentVersion = getInstalledVersion()
        val payload = fetchUpdatePayload(currentVersion) ?: run {
            if (manual) notifyCheckFailed("Unable to reach update channel.")
            return
        }

        props.setValue(LAST_CHECKED_AT_KEY, System.currentTimeMillis().toString())

        val latestVersion = payload.getAsStringOrEmpty("latestVersion")
        val downloadUrl = payload.getAsStringOrEmpty("downloadUrl")
        val installUrl = payload.getAsStringOrEmpty("installUrl")
        val releaseNotesUrl = payload.getAsStringOrEmpty("releaseNotesUrl")
        val serverMessage = payload.getAsStringOrEmpty("message")

        if (latestVersion.isBlank() || downloadUrl.isBlank()) {
            if (manual) notifyCheckFailed("Update channel response is missing version or download URL.")
            return
        }

        if (!isVersionGreater(latestVersion, currentVersion)) {
            if (manual) notifyNoUpdate(currentVersion)
            return
        }

        val lastNotifiedVersion = props.getValue(LAST_NOTIFIED_VERSION_KEY, "")
        if (!manual && lastNotifiedVersion == latestVersion) return

        props.setValue(LAST_NOTIFIED_VERSION_KEY, latestVersion)
        notifyUpdateAvailable(
            latestVersion = latestVersion,
            currentVersion = currentVersion,
            downloadUrl = downloadUrl,
            installUrl = installUrl,
            releaseNotesUrl = releaseNotesUrl,
            serverMessage = serverMessage
        )
    }

    private fun fetchUpdatePayload(currentVersion: String): JsonObject? {
        val tried = mutableSetOf<String>()
        val baseUrls = listOf(auth.getBaseUrl().trim().trimEnd('/'), FALLBACK_PUBLIC_API_BASE_URL)

        for (baseUrl in baseUrls) {
            if (baseUrl.isBlank() || !tried.add(baseUrl)) continue

            val requestUrl = "$baseUrl/ide/plugin/update-channel?currentVersion=" +
                URLEncoder.encode(currentVersion, StandardCharsets.UTF_8)

            val request = HttpRequest.newBuilder()
                .uri(URI.create(requestUrl))
                .header("Accept", "application/json")
                .GET()
                .build()

            val response = runCatching { http.send(request, HttpResponse.BodyHandlers.ofString()) }.getOrNull() ?: continue
            if (response.statusCode() !in 200..299) continue

            val payload = runCatching { JsonParser.parseString(response.body()).asJsonObject }.getOrNull() ?: continue
            return payload
        }

        return null
    }

    private fun notifyNoUpdate(currentVersion: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("DevManager Notifications")
            .createNotification(
                "Plugin is up to date",
                "Current version: $currentVersion",
                NotificationType.INFORMATION
            )
            .notify(project)
    }

    private fun notifyCheckFailed(message: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("DevManager Notifications")
            .createNotification(
                "DevManager plugin update check failed",
                message,
                NotificationType.WARNING
            )
            .notify(project)
    }

    private fun notifyUpdateAvailable(
        latestVersion: String,
        currentVersion: String,
        downloadUrl: String,
        installUrl: String,
        releaseNotesUrl: String,
        serverMessage: String
    ) {
        val content = buildString {
            append("Installed: ")
            append(currentVersion)
            append(" | Latest: ")
            append(latestVersion)
            if (serverMessage.isNotBlank()) {
                append("\n")
                append(serverMessage)
            }
        }

        val notification = NotificationGroupManager.getInstance()
            .getNotificationGroup("DevManager Notifications")
            .createNotification("DevManager plugin update available", content, NotificationType.WARNING)

        val primaryUrl = if (installUrl.isNotBlank()) installUrl else downloadUrl
        val primaryLabel = if (installUrl.isNotBlank()) "Install from URL" else "Download Update"
        notification.addAction(NotificationAction.createSimpleExpiring(primaryLabel) { BrowserUtil.browse(primaryUrl) })

        if (releaseNotesUrl.isNotBlank()) {
            notification.addAction(
                NotificationAction.createSimple("Release Notes") {
                    BrowserUtil.browse(releaseNotesUrl)
                }
            )
        }

        notification.notify(project)
    }

    private fun getInstalledVersion(): String {
        val plugin = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))
        return plugin?.version?.trim().orEmpty().ifBlank { "0.0.0" }
    }

    private fun isVersionGreater(candidate: String, current: String): Boolean {
        val a = versionParts(candidate)
        val b = versionParts(current)
        val maxLength = maxOf(a.size, b.size)
        for (index in 0 until maxLength) {
            val left = if (index < a.size) a[index] else 0
            val right = if (index < b.size) b[index] else 0
            if (left > right) return true
            if (left < right) return false
        }
        return false
    }

    private fun versionParts(version: String): List<Int> {
        return version.split(Regex("[^0-9]+"))
            .mapNotNull { it.toIntOrNull() }
    }

    private fun JsonObject.getAsStringOrEmpty(key: String): String {
        if (!has(key) || get(key).isJsonNull) return ""
        return runCatching { get(key).asString }.getOrElse { "" }
    }

    companion object {
        private const val PLUGIN_ID = "com.devmanager.webstorm.plugin"
        private const val FALLBACK_PUBLIC_API_BASE_URL = "https://beta.devregion.com/api"
        private const val LAST_NOTIFIED_VERSION_KEY = "devmanager.plugin.update.lastNotifiedVersion"
        private const val LAST_CHECKED_AT_KEY = "devmanager.plugin.update.lastCheckedAt"
        private val MIN_AUTO_CHECK_INTERVAL_MS = TimeUnit.MINUTES.toMillis(30)
        private const val PERIODIC_CHECK_HOURS = 6L
    }
}
