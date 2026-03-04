package com.devmanager.plugin.services

import com.devmanager.plugin.model.TaskItem
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages

@Service(Service.Level.PROJECT)
class ActionController(private val project: Project) {
    private val api = project.getService(TaskApiService::class.java)
    private val git = project.getService(GitWorkflowService::class.java)

    fun checkoutTaskBranch(task: TaskItem) = runAction("Checkout Branch") {
        val branch = task.githubBranch ?: error("Task has no githubBranch")
        git.checkoutBranch(branch)
    }

    fun pullDev(task: TaskItem) = runAction("Pull Dev") {
        val branch = task.githubBranch ?: error("Task has no githubBranch")
        git.checkoutBranch(branch)
        git.pullCurrentBranch()
        git.mergeDevIntoCurrent()
    }

    fun pushTask(task: TaskItem) = runAction("Push Branch") {
        val branch = task.githubBranch ?: error("Task has no githubBranch")
        git.checkoutBranch(branch)
        git.pushCurrentBranch()
    }

    fun startTask(task: TaskItem) = runAction("Start Task") {
        api.postTaskAction(task._id, "start")
    }

    fun pauseTask(task: TaskItem) = runAction("Pause Task") {
        api.postTaskAction(task._id, "pause")
    }

    fun resumeTask(task: TaskItem) = runAction("Resume Task") {
        api.postTaskAction(task._id, "resume")
    }

    fun finishTask(task: TaskItem) = runAction("Finish Task") {
        api.postTaskAction(task._id, "finish")
    }

    private fun runAction(title: String, action: () -> Unit) {
        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                action()
                notify("$title completed.", NotificationType.INFORMATION)
            } catch (t: Throwable) {
                val message = if (t is ApiException) {
                    when (t.code) {
                        "no_changes_not_allowed" -> "Cannot finish task: no code changes found in task branch."
                        "merge_conflict_dev_to_task", "merge_conflict_task_to_dev" -> "Merge conflict detected. Resolve on GitHub, then retry."
                        else -> t.serverMessage ?: t.rawBody ?: t.message
                    }
                } else {
                    t.message
                }
                notify("$title failed: $message", NotificationType.ERROR)
                ApplicationManager.getApplication().invokeLater {
                    Messages.showErrorDialog(project, "$title failed.\n\n$message", "DevManager")
                }
            }
        }
    }

    private fun notify(content: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("DevManager Notifications")
            .createNotification(content, type)
            .notify(project)
    }
}
