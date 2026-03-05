package com.devmanager.plugin.services

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

class UpdateCheckerStartupActivity : ProjectActivity {
    override suspend fun execute(project: Project) {
        project.getService(UpdateCheckerService::class.java).start()
    }
}
