package com.devmanager.plugin.services

import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project

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
        PasswordSafe.instance.set(attrs, Credentials("devmanager", token.trim()))
    }

    fun clear() {
        props.unsetValue("devmanager.baseUrl")
        PasswordSafe.instance.set(attrs, null)
    }
}

