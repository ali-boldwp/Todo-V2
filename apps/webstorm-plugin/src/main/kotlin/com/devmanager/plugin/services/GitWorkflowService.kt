package com.devmanager.plugin.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import git4idea.commands.Git
import git4idea.commands.GitCommand
import git4idea.commands.GitLineHandler
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryManager

@Service(Service.Level.PROJECT)
class GitWorkflowService(private val project: Project) {
    fun checkoutBranch(branch: String) {
        val repo = repository() ?: error("No Git repository detected in current project.")
        val handler = GitLineHandler(project, repo.root, GitCommand.CHECKOUT)
        handler.addParameters(branch)
        run(handler, "git checkout $branch")
    }

    fun pullCurrentBranch() {
        val repo = repository() ?: error("No Git repository detected in current project.")
        val handler = GitLineHandler(project, repo.root, GitCommand.PULL)
        handler.addParameters("--ff-only")
        run(handler, "git pull --ff-only")
    }

    fun mergeDevIntoCurrent() {
        val repo = repository() ?: error("No Git repository detected in current project.")
        val handler = GitLineHandler(project, repo.root, GitCommand.MERGE)
        handler.addParameters("dev")
        run(handler, "git merge dev")
    }

    fun pushCurrentBranch() {
        val repo = repository() ?: error("No Git repository detected in current project.")
        val handler = GitLineHandler(project, repo.root, GitCommand.PUSH)
        handler.addParameters("origin", "HEAD")
        run(handler, "git push origin HEAD")
    }

    private fun run(handler: GitLineHandler, label: String) {
        val result = Git.getInstance().runCommand(handler)
        if (!result.success()) {
            val errorMessage = result.errorOutputAsJoinedString.ifBlank { "$label failed." }
            error(errorMessage)
        }
    }

    private fun repository(): GitRepository? {
        return GitRepositoryManager.getInstance(project).repositories.firstOrNull()
    }
}

