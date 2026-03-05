package com.devmanager.plugin.services

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project

@Service(Service.Level.PROJECT)
class EditorAccessGuardService(private val project: Project) {
    private val auth = project.getService(AuthService::class.java)
    private var notifiedWhileLoggedOut = false

    init {
        val connection = project.messageBus.connect()
        connection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, object : FileEditorManagerListener {
            override fun fileOpened(source: FileEditorManager, file: com.intellij.openapi.vfs.VirtualFile) {
                enforceLoginLock(showNotification = true)
            }
        })
        connection.subscribe(AuthService.AUTH_STATE_TOPIC, object : AuthService.AuthStateListener {
            override fun authStateChanged(isLoggedIn: Boolean) {
                if (isLoggedIn) {
                    notifiedWhileLoggedOut = false
                    return
                }
                enforceLoginLock(showNotification = true)
            }
        })

        ApplicationManager.getApplication().invokeLater {
            enforceLoginLock(showNotification = true)
        }
    }

    private fun enforceLoginLock(showNotification: Boolean) {
        if (project.isDisposed || auth.getToken().isNotBlank()) return

        val manager = FileEditorManager.getInstance(project)
        manager.openFiles.forEach(manager::closeFile)

        if (showNotification && !notifiedWhileLoggedOut) {
            notifiedWhileLoggedOut = true
            NotificationGroupManager.getInstance()
                .getNotificationGroup("DevManager Notifications")
                .createNotification(
                    "Login required",
                    "Login with DevRegion in the DevManager tool window to access editors.",
                    NotificationType.WARNING
                )
                .notify(project)
        }
    }
}
