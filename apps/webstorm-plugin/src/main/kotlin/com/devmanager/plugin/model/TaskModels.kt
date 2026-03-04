package com.devmanager.plugin.model

data class TaskItem(
    val _id: String,
    val title: String,
    val status: String? = null,
    val priority: String? = null,
    val projectId: String? = null,
    val githubBranch: String? = null,
    val verificationStatus: String? = null,
    val updatedAt: String? = null,
)

data class ProjectItem(
    val _id: String,
    val name: String? = null,
)

data class LoginResponse(
    val token: String,
)

data class TaskLogsResponse(
    val logs: List<TaskActivityLog> = emptyList()
)

data class TaskActivityLog(
    val action: String? = null,
    val message: String? = null,
    val actorId: TaskActor? = null,
    val actorRole: String? = null,
    val metadata: Any? = null,
    val createdAt: String? = null,
)

data class TaskActor(
    val _id: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val email: String? = null,
    val role: String? = null,
)
