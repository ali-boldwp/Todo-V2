package com.devmanager.plugin.ui

import com.devmanager.plugin.model.TaskItem
import java.awt.Color
import java.awt.Component
import javax.swing.BorderFactory
import javax.swing.DefaultListCellRenderer
import javax.swing.JList
import javax.swing.JLabel

class TaskRowRenderer : DefaultListCellRenderer() {
    override fun getListCellRendererComponent(
        list: JList<*>?,
        value: Any?,
        index: Int,
        isSelected: Boolean,
        cellHasFocus: Boolean
    ): Component {
        val c = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus) as JLabel
        val task = value as? TaskItem
        c.background = if (isSelected) ModernUi.accentMuted else ModernUi.panelBgAlt
        c.foreground = ModernUi.textStrong
        c.isOpaque = true
        c.text = if (task == null) {
            ""
        } else {
            val status = (task.status ?: "unknown").replace('_', ' ')
            val priority = task.priority ?: "medium"
            val branch = task.githubBranch ?: "-"
            val muted = colorHex(ModernUi.textMuted)
            "<html><div style='padding:4px 2px;'>" +
                "<div><b>${escape(task.title)}</b></div>" +
                "<div style='font-size:10px;color:$muted;'>${escape(status)} | ${escape(priority)} | ${escape(branch)}</div>" +
                "</div></html>"
        }
        c.border = BorderFactory.createEmptyBorder(6, 8, 6, 8)
        return c
    }

    private fun escape(input: String): String {
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
    }

    private fun colorHex(color: Color): String {
        return "#%02x%02x%02x".format(color.red, color.green, color.blue)
    }
}
