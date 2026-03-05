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
            runCatching {
                val baseUrl = auth.getBaseUrl().trim().trimEnd('/')
                if (baseUrl.isBlank()) return@runCatching

                val currentVersion = getInstalledVersion()
                val requestUrl = "$baseUrl/ide/plugin/update-channel?currentVersion=" +
                    URLEncoder.encode(currentVersion, StandardCharsets.UTF_8)

                val request = HttpRequest.newBuilder()
                    .uri(URI.create(requestUrl))
                    .header("Accept", "application/json")
                    .GET()
                    .build()

                val response = http.send(request, HttpResponse.BodyHandlers.ofString())
                if (response.statusCode() !in 200..299) return@runCatching

                props.setValue(LAST_CHECKED_AT_KEY, System.currentTimeMillis().toString())
                val payload = JsonParser.parseString(response.body()).asJsonObject
                val latestVersion = payload.getAsStringOrEmpty("latestVersion")
                val downloadUrl = payload.getAsStringOrEmpty("downloadUrl")
                val releaseNotesUrl = payload.getAsStringOrEmpty("releaseNotesUrl")
                val serverMessage = payload.getAsStringOrEmpty("message")

                if (latestVersion.isBlank() || downloadUrl.isBlank()) return@runCatching
                if (!isVersionGreater(latestVersion, currentVersion)) {
                    if (manual) notifyNoUpdate(currentVersion)
                    return@runCatching
                }

                val lastNotifiedVersion = props.getValue(LAST_NOTIFIED_VERSION_KEY, "")
                if (!manual && lastNotifiedVersion == latestVersion) return@runCatching

                props.setValue(LAST_NOTIFIED_VERSION_KEY, latestVersion)
                notifyUpdateAvailable(
                    latestVersion = latestVersion,
                    currentVersion = currentVersion,
                    downloadUrl = downloadUrl,
                    releaseNotesUrl = releaseNotesUrl,
                    serverMessage = serverMessage
                )
            }
        }
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

    private fun notifyUpdateAvailable(
        latestVersion: String,
        currentVersion: String,
        downloadUrl: String,
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

        notification.addAction(
            NotificationAction.createSimpleExpiring("Download Update") {
                BrowserUtil.browse(downloadUrl)
            }
        )

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
        private const val LAST_NOTIFIED_VERSION_KEY = "devmanager.plugin.update.lastNotifiedVersion"
        private const val LAST_CHECKED_AT_KEY = "devmanager.plugin.update.lastCheckedAt"
        private val MIN_AUTO_CHECK_INTERVAL_MS = TimeUnit.MINUTES.toMillis(30)
        private const val PERIODIC_CHECK_HOURS = 6L
    }
}
