package com.devmanager.plugin.ui

import com.devmanager.plugin.model.TaskItem
import com.devmanager.plugin.services.TaskApiService
import com.intellij.openapi.application.ApplicationManager
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.awt.GridLayout
import javax.swing.BorderFactory
import javax.swing.DefaultComboBoxModel
import javax.swing.DefaultListModel
import javax.swing.JButton
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JList
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextField
import javax.swing.ListSelectionModel

class TasksPanel(
    private val api: TaskApiService,
    private val includeProjectFilter: Boolean,
    private val onTaskSelected: (TaskItem?) -> Unit,
) {
    private val allTasks: MutableList<TaskItem> = mutableListOf()
    private val model = DefaultListModel<TaskItem>()
    private val list = JList(model)
    private val refreshButton = JButton("Refresh")
    private val searchField = JTextField(16)
    private val statusCombo = JComboBox(arrayOf("all", "todo", "in_progress", "review", "under_verification", "done", "clarification", "clarified"))
    private val priorityCombo = JComboBox(arrayOf("all", "low", "medium", "high", "urgent"))
    private val projectCombo = JComboBox<ProjectComboItem>()
    private val root = JPanel(BorderLayout())

    val component: JComponent = root

    init {
        ModernUi.styleRoot(root)
        list.selectionMode = ListSelectionModel.SINGLE_SELECTION
        list.cellRenderer = TaskRowRenderer()
        list.background = ModernUi.panelBgAlt
        list.foreground = ModernUi.textStrong
        list.selectionBackground = ModernUi.accentMuted
        list.selectionForeground = ModernUi.textStrong
        list.fixedCellHeight = 58
        list.addListSelectionListener {
            onTaskSelected(list.selectedValue)
        }

        refreshButton.addActionListener { refresh() }
        searchField.addActionListener { applyFilters() }
        statusCombo.addActionListener { applyFilters() }
        priorityCombo.addActionListener { applyFilters() }
        projectCombo.addActionListener { applyFilters() }

        ModernUi.styleInput(searchField)
        ModernUi.styleCombo(statusCombo)
        ModernUi.styleCombo(priorityCombo)
        ModernUi.styleCombo(projectCombo)
        ModernUi.styleSecondary(refreshButton)

        val filters = JPanel(GridLayout(0, 1, 0, 8))
        filters.isOpaque = false
        if (includeProjectFilter) {
            filters.add(fieldRow("Project", projectCombo))
            projectCombo.toolTipText = "Project filter"
            loadProjects()
        }
        filters.add(fieldRow("Status", statusCombo))
        filters.add(fieldRow("Priority", priorityCombo))
        searchField.toolTipText = "Search by title or id"
        filters.add(fieldRow("Search", searchField))

        val top = GradientPanel(ModernUi.panelBg, ModernUi.panelBgAlt)
        top.border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
        top.add(filters, BorderLayout.CENTER)

        val actions = JPanel(FlowLayout(FlowLayout.LEFT, 0, 8))
        actions.isOpaque = false
        actions.add(refreshButton)
        top.add(actions, BorderLayout.SOUTH)

        root.add(top, BorderLayout.NORTH)
        val scroll = JScrollPane(list)
        scroll.border = BorderFactory.createLineBorder(ModernUi.border)
        scroll.viewport.background = ModernUi.panelBgAlt
        root.add(scroll, BorderLayout.CENTER)
        root.border = BorderFactory.createEmptyBorder(8, 8, 8, 8)
    }

    fun refresh() {
        ApplicationManager.getApplication().executeOnPooledThread {
            val projectId = selectedProjectId()
            val items = runCatching { api.fetchTasks(projectId) }.getOrElse { emptyList() }
            ApplicationManager.getApplication().invokeLater {
                allTasks.clear()
                allTasks.addAll(items)
                applyFilters()
            }
        }
    }

    private fun applyFilters() {
        val status = statusCombo.selectedItem?.toString()?.trim().orEmpty()
        val priority = priorityCombo.selectedItem?.toString()?.trim().orEmpty()
        val query = searchField.text.trim().lowercase()
        val projectId = selectedProjectId()

        val filtered = allTasks.filter { task ->
            val statusOk = status == "all" || task.status == status
            val priorityOk = priority == "all" || task.priority == priority
            val searchOk = query.isBlank() || task.title.lowercase().contains(query) || task._id.lowercase().contains(query)
            val projectOk = projectId.isNullOrBlank() || task.projectId == projectId
            statusOk && priorityOk && searchOk && projectOk
        }

        model.clear()
        filtered.forEach(model::addElement)
        if (model.size > 0) {
            if (list.selectedIndex !in 0 until model.size) {
                list.selectedIndex = 0
            }
            onTaskSelected(list.selectedValue)
        } else {
            onTaskSelected(null)
        }
    }

    private fun loadProjects() {
        ApplicationManager.getApplication().executeOnPooledThread {
            val projects = runCatching { api.fetchProjects() }.getOrElse { emptyList() }
            ApplicationManager.getApplication().invokeLater {
                val comboModel = DefaultComboBoxModel<ProjectComboItem>()
                comboModel.addElement(ProjectComboItem("All Projects", null))
                projects.forEach {
                    comboModel.addElement(ProjectComboItem(it.name ?: it._id, it._id))
                }
                projectCombo.model = comboModel
                projectCombo.selectedIndex = 0
            }
        }
    }

    private fun selectedProjectId(): String? {
        if (!includeProjectFilter) return null
        return (projectCombo.selectedItem as? ProjectComboItem)?.id
    }

    private fun fieldRow(label: String, input: JComponent): JPanel {
        val row = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0))
        row.isOpaque = false
        val title = JLabel(label)
        title.foreground = ModernUi.textMuted
        row.add(title)
        row.add(input)
        return row
    }
}

private data class ProjectComboItem(val label: String, val id: String?) {
    override fun toString(): String = label
}
