package com.devmanager.plugin

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class DevManagerToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = DevManagerToolWindowPanel(project)
        val content = ContentFactory.getInstance().createContent(panel.content, "", false)
        toolWindow.contentManager.addContent(content)
    }
}

