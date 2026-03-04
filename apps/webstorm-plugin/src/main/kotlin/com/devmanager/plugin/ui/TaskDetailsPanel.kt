package com.devmanager.plugin.ui

import com.devmanager.plugin.model.TaskActivityLog
import com.devmanager.plugin.model.TaskItem
import com.devmanager.plugin.services.ActionController
import com.devmanager.plugin.services.TaskApiService
import com.google.gson.GsonBuilder
import com.intellij.openapi.application.ApplicationManager
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.awt.Font
import javax.swing.BorderFactory
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextArea
import javax.swing.SwingConstants

class TaskDetailsPanel(
    private val api: TaskApiService,
    private val actions: ActionController,
) {
    private val gson = GsonBuilder().setPrettyPrinting().create()
    private var currentTask: TaskItem? = null

    private val titleLabel = JLabel("Select a task", SwingConstants.LEFT)
    private val statusBadge = JLabel("-", SwingConstants.LEFT)
    private val priorityBadge = JLabel("-", SwingConstants.LEFT)
    private val branchBadge = JLabel("-", SwingConstants.LEFT)
    private val logsArea = JTextArea()

    private val startButton = JButton("Start")
    private val pauseButton = JButton("Pause")
    private val resumeButton = JButton("Resume")
    private val checkoutButton = JButton("Checkout Branch")
    private val pullDevButton = JButton("Pull Dev")
    private val pushButton = JButton("Push")
    private val finishButton = JButton("Finish")
    private val refreshLogsButton = JButton("Refresh Logs")

    private val root = JPanel(BorderLayout())
    val component: JComponent = root

    init {
        ModernUi.styleRoot(root)
        logsArea.isEditable = false
        logsArea.lineWrap = true
        logsArea.wrapStyleWord = true
        logsArea.font = Font(Font.MONOSPACED, Font.PLAIN, 12)
        logsArea.border = BorderFactory.createEmptyBorder(8, 8, 8, 8)
        logsArea.background = ModernUi.panelBgAlt
        logsArea.foreground = ModernUi.textStrong
        logsArea.caretColor = ModernUi.textStrong

        startButton.addActionListener { currentTask?.let(actions::startTask) }
        pauseButton.addActionListener { currentTask?.let(actions::pauseTask) }
        resumeButton.addActionListener { currentTask?.let(actions::resumeTask) }
        checkoutButton.addActionListener { currentTask?.let(actions::checkoutTaskBranch) }
        pullDevButton.addActionListener { currentTask?.let(actions::pullDev) }
        pushButton.addActionListener { currentTask?.let(actions::pushTask) }
        finishButton.addActionListener { currentTask?.let(actions::finishTask) }
        refreshLogsButton.addActionListener { refreshLogs() }

        ModernUi.styleSecondary(startButton)
        ModernUi.styleSecondary(pauseButton)
        ModernUi.styleSecondary(resumeButton)
        ModernUi.styleSecondary(checkoutButton)
        ModernUi.styleSecondary(pullDevButton)
        ModernUi.styleSecondary(pushButton)
        ModernUi.stylePrimary(finishButton)
        ModernUi.styleSecondary(refreshLogsButton)

        styleBadge(statusBadge)
        styleBadge(priorityBadge)
        styleBadge(branchBadge)

        val header = GradientPanel(ModernUi.panelBg, ModernUi.panelBgAlt)
        titleLabel.font = titleLabel.font.deriveFont(Font.BOLD, 18f)
        titleLabel.foreground = ModernUi.textStrong
        titleLabel.border = BorderFactory.createEmptyBorder(2, 2, 8, 2)
        val badges = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0))
        badges.isOpaque = false
        badges.add(statusBadge)
        badges.add(priorityBadge)
        badges.add(branchBadge)
        header.border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
        header.add(titleLabel, BorderLayout.NORTH)
        header.add(badges, BorderLayout.SOUTH)

        val actionsRow = GradientPanel(ModernUi.panelBgAlt, ModernUi.panelBg)
        actionsRow.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(ModernUi.border),
            BorderFactory.createEmptyBorder(8, 8, 8, 8)
        )
        val actionButtons = JPanel(FlowLayout(FlowLayout.LEFT, 8, 6))
        actionButtons.isOpaque = false
        actionButtons.add(startButton)
        actionButtons.add(pauseButton)
        actionButtons.add(resumeButton)
        actionButtons.add(checkoutButton)
        actionButtons.add(pullDevButton)
        actionButtons.add(pushButton)
        actionButtons.add(finishButton)
        actionButtons.add(refreshLogsButton)
        actionsRow.add(actionButtons, BorderLayout.CENTER)

        val top = JPanel(BorderLayout())
        top.background = ModernUi.rootBg
        top.border = BorderFactory.createEmptyBorder(6, 6, 8, 6)
        top.add(header, BorderLayout.NORTH)
        top.add(actionsRow, BorderLayout.SOUTH)

        val scroll = JScrollPane(logsArea)
        scroll.border = BorderFactory.createLineBorder(ModernUi.border)
        scroll.viewport.background = ModernUi.panelBgAlt

        root.add(top, BorderLayout.NORTH)
        root.add(scroll, BorderLayout.CENTER)
        root.border = BorderFactory.createEmptyBorder(8, 8, 8, 8)
    }

    fun setTask(task: TaskItem?) {
        currentTask = task
        if (task == null) {
            titleLabel.text = "Select a task"
            statusBadge.text = "Status: -"
            priorityBadge.text = "Priority: -"
            branchBadge.text = "Branch: -"
            logsArea.text = ""
            return
        }

        titleLabel.text = task.title
        statusBadge.text = "Status: ${task.status ?: "-"}"
        priorityBadge.text = "Priority: ${task.priority ?: "-"}"
        branchBadge.text = "Branch: ${task.githubBranch ?: "-"}"
        refreshLogs()
    }

    private fun refreshLogs() {
        val task = currentTask ?: return
        logsArea.text = "Loading logs..."
        ApplicationManager.getApplication().executeOnPooledThread {
            val logs = runCatching { api.fetchTaskLogs(task._id).logs }.getOrElse {
                listOf(
                    TaskActivityLog(
                        action = "error",
                        message = "Failed to load logs: ${it.message}",
                        createdAt = null
                    )
                )
            }
            val rendered = buildString {
                logs.forEach { log ->
                    val actor = log.actorId?.let {
                        listOfNotNull(it.firstName, it.lastName).joinToString(" ").ifBlank { it.email ?: "Unknown" }
                    } ?: "System"
                    appendLine("Action: ${log.action ?: "-"}")
                    appendLine("Time: ${log.createdAt ?: "-"}")
                    appendLine("Actor: $actor ${log.actorRole?.let { "($it)" } ?: ""}")
                    appendLine("Message: ${log.message ?: "-"}")
                    if (log.metadata != null) {
                        appendLine("Metadata:")
                        appendLine(gson.toJson(log.metadata))
                    }
                    appendLine("------------------------------------------------------------")
                }
            }.ifBlank { "No activity logs found." }

            ApplicationManager.getApplication().invokeLater {
                logsArea.text = rendered
                logsArea.caretPosition = 0
            }
        }
    }

    private fun styleBadge(label: JLabel) {
        label.isOpaque = true
        label.background = ModernUi.accentMuted
        label.foreground = ModernUi.textStrong
        label.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(ModernUi.border),
            BorderFactory.createEmptyBorder(4, 8, 4, 8)
        )
    }
}
