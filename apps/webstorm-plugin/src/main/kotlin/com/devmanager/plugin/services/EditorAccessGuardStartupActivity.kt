package com.devmanager.plugin.services

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class EditorAccessGuardStartupActivity : ProjectActivity {
    override suspend fun execute(project: Project) {
        project.getService(EditorAccessGuardService::class.java)
    }
}
