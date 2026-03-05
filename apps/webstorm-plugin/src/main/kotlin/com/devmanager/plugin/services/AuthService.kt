package com.devmanager.plugin.services

import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic

@Service(Service.Level.PROJECT)
class AuthService(private val project: Project) {
    private val props = PropertiesComponent.getInstance(project)
    private val attrs = CredentialAttributes("DevManager.WebStorm.Token")

    fun getBaseUrl(): String = props.getValue("devmanager.baseUrl", "http://localhost:5000/api")

    fun setBaseUrl(value: String) {
        props.setValue("devmanager.baseUrl", value.trim())
    }

    fun getToken(): String = PasswordSafe.instance.get(attrs)?.getPasswordAsString().orEmpty()

    fun setToken(token: String) {
        val normalized = token.trim()
        PasswordSafe.instance.set(attrs, Credentials("devmanager", normalized))
        publishAuthState(normalized.isNotBlank())
    }

    fun clear() {
        props.unsetValue("devmanager.baseUrl")
        PasswordSafe.instance.set(attrs, null)
        publishAuthState(false)
    }

    private fun publishAuthState(isLoggedIn: Boolean) {
        if (project.isDisposed) return
        project.messageBus.syncPublisher(AUTH_STATE_TOPIC).authStateChanged(isLoggedIn)
    }

    interface AuthStateListener {
        fun authStateChanged(isLoggedIn: Boolean)
    }

    companion object {
        val AUTH_STATE_TOPIC: Topic<AuthStateListener> =
            Topic.create("DevManager Auth State", AuthStateListener::class.java)
    }
}
