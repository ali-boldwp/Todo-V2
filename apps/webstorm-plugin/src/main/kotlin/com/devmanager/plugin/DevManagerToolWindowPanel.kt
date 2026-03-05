package com.devmanager.plugin

import com.devmanager.plugin.services.ActionController
import com.devmanager.plugin.services.AuthService
import com.devmanager.plugin.services.TaskApiService
import com.devmanager.plugin.services.UpdateCheckerService
import com.devmanager.plugin.ui.GradientPanel
import com.devmanager.plugin.ui.ModernUi
import com.devmanager.plugin.ui.TaskDetailsPanel
import com.devmanager.plugin.ui.TasksPanel
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.ui.JBSplitter
import com.sun.net.httpserver.HttpServer
import java.awt.BorderLayout
import java.awt.CardLayout
import java.awt.Color
import java.awt.Dimension
import java.awt.FlowLayout
import java.awt.Font
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.util.concurrent.Executors
import javax.swing.BorderFactory
import javax.swing.Box
import javax.swing.BoxLayout
import javax.swing.ButtonGroup
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JTextField
import javax.swing.JToggleButton
import javax.swing.SwingConstants

class DevManagerToolWindowPanel(project: Project) {
    private val auth = project.getService(AuthService::class.java)
    private val api = project.getService(TaskApiService::class.java)
    private val actions = project.getService(ActionController::class.java)
    private val updates = project.getService(UpdateCheckerService::class.java)

    private val baseUrlField = JTextField(auth.getBaseUrl(), 34)
    private val loginButton = JButton("Login with DevRegion")
    private val loginStatusLabel = JLabel(" ", SwingConstants.LEFT)
    private val fallbackTokenField = JTextField("", 32)
    private val applyFallbackTokenButton = JButton("Use Token")
    private val fallbackPanel = JPanel(GridBagLayout())

    private val refreshAllButton = JButton("Refresh")
    private val checkUpdatesButton = JButton("Check Updates")
    private val logoutButton = JButton("Logout")
    private val connectedLabel = JLabel("", SwingConstants.LEFT)
    private val viewMyTasksButton = JToggleButton("My Tasks")
    private val viewProjectTasksButton = JToggleButton("Project Tasks")
    private val tasksCardLayout = CardLayout()
    private val tasksCards = JPanel(tasksCardLayout)

    private val detailsPanel = TaskDetailsPanel(api, actions)
    private val myTasksPanel = TasksPanel(api = api, includeProjectFilter = false) { detailsPanel.setTask(it) }
    private val projectTasksPanel = TasksPanel(api = api, includeProjectFilter = true) { detailsPanel.setTask(it) }

    private val cardLayout = CardLayout()
    private val cards = JPanel(cardLayout)
    private val loginPanel = buildLoginPanel(project)
    private val appPanel = buildAppPanel()

    val content: JComponent = JPanel(BorderLayout())

    init {
        ModernUi.styleRoot(content)
        cards.add(loginPanel, CARD_LOGIN)
        cards.add(appPanel, CARD_APP)

        val root = content as JPanel
        root.add(cards, BorderLayout.CENTER)

        loginButton.addActionListener { doBrowserLogin(project) }
        applyFallbackTokenButton.addActionListener {
            val token = fallbackTokenField.text.trim()
            if (token.isBlank()) {
                loginStatusLabel.text = "Token is required."
                return@addActionListener
            }
            auth.setBaseUrl(baseUrlField.text.trim())
            auth.setToken(token)
            hideFallbackTokenEntry()
            switchToApp()
            refreshAll()
        }
        refreshAllButton.addActionListener { refreshAll() }
        logoutButton.addActionListener {
            auth.setToken("")
            detailsPanel.setTask(null)
            switchToLogin()
        }
        viewMyTasksButton.addActionListener { switchTaskView(CARD_MY_TASKS) }
        viewProjectTasksButton.addActionListener { switchTaskView(CARD_PROJECT_TASKS) }

        if (auth.getToken().isBlank()) {
            switchToLogin()
        } else {
            switchToApp()
            refreshAll()
        }

        updates.start()
    }

    private fun buildLoginPanel(project: Project): JPanel {
        val panel = JPanel(GridBagLayout())
        ModernUi.styleRoot(panel)
        panel.border = BorderFactory.createEmptyBorder(24, 24, 24, 24)

        val card = GradientPanel(ModernUi.panelBg, ModernUi.panelBgAlt)
        card.layout = BoxLayout(card, BoxLayout.Y_AXIS)
        card.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(ModernUi.border),
            BorderFactory.createEmptyBorder(24, 24, 24, 24)
        )
        card.maximumSize = Dimension(560, 300)

        val title = JLabel("DevManager Access", SwingConstants.LEFT)
        title.font = title.font.deriveFont(Font.BOLD, 20f)
        title.foreground = ModernUi.textStrong
        title.alignmentX = JComponent.LEFT_ALIGNMENT

        val subtitle = JLabel("Dedicated workspace for task flow and branch operations.", SwingConstants.LEFT)
        subtitle.font = subtitle.font.deriveFont(Font.PLAIN, 12f)
        subtitle.foreground = ModernUi.textMuted
        subtitle.alignmentX = JComponent.LEFT_ALIGNMENT

        val form = JPanel(GridBagLayout())
        form.alignmentX = JComponent.LEFT_ALIGNMENT
        form.isOpaque = false
        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(6, 0, 6, 0)
            weightx = 1.0
            gridx = 0
        }

        val baseUrlLabel = JLabel("API Base URL")
        baseUrlLabel.foreground = ModernUi.textMuted
        form.add(baseUrlLabel, gbc)
        gbc.gridy = 1
        ModernUi.styleInput(baseUrlField)
        form.add(baseUrlField, gbc)

        loginButton.alignmentX = JComponent.LEFT_ALIGNMENT
        loginButton.preferredSize = Dimension(190, 34)
        ModernUi.stylePrimary(loginButton)

        loginStatusLabel.alignmentX = JComponent.LEFT_ALIGNMENT
        loginStatusLabel.foreground = ModernUi.warning

        val hint = JLabel("You will be redirected to https://beta.devregion.com/", SwingConstants.LEFT)
        hint.alignmentX = JComponent.LEFT_ALIGNMENT
        hint.font = hint.font.deriveFont(Font.PLAIN, 11f)
        hint.foreground = ModernUi.textMuted

        configureFallbackPanel()

        card.add(title)
        card.add(Box.createVerticalStrut(6))
        card.add(subtitle)
        card.add(Box.createVerticalStrut(18))
        card.add(form)
        card.add(Box.createVerticalStrut(8))
        card.add(loginButton)
        card.add(Box.createVerticalStrut(8))
        card.add(hint)
        card.add(Box.createVerticalStrut(8))
        card.add(loginStatusLabel)
        card.add(Box.createVerticalStrut(8))
        card.add(fallbackPanel)

        val wrapper = JPanel(BorderLayout())
        wrapper.isOpaque = false
        wrapper.add(card, BorderLayout.CENTER)

        panel.add(wrapper, GridBagConstraints().apply {
            gridx = 0
            gridy = 0
            weightx = 1.0
            weighty = 1.0
            anchor = GridBagConstraints.CENTER
            fill = GridBagConstraints.NONE
        })

        return panel
    }

    private fun buildAppPanel(): JPanel {
        val panel = JPanel(BorderLayout())
        ModernUi.styleRoot(panel)
        panel.border = BorderFactory.createEmptyBorder(8, 8, 8, 8)

        val toolbar = GradientPanel(ModernUi.panelBg, ModernUi.panelBgAlt)
        toolbar.border = BorderFactory.createEmptyBorder(8, 10, 8, 10)

        connectedLabel.font = connectedLabel.font.deriveFont(Font.PLAIN, 12f)
        connectedLabel.foreground = ModernUi.textMuted
        val workspaceLabel = JLabel("DevManager Workspace")
        workspaceLabel.font = workspaceLabel.font.deriveFont(Font.BOLD, 14f)
        workspaceLabel.foreground = ModernUi.textStrong

        ModernUi.styleSecondary(refreshAllButton)
        ModernUi.styleSecondary(checkUpdatesButton)
        ModernUi.styleDanger(logoutButton)
        checkUpdatesButton.addActionListener { updates.checkNow(manual = true) }

        val toolbarActions = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0))
        toolbarActions.isOpaque = false
        toolbarActions.add(refreshAllButton)
        toolbarActions.add(checkUpdatesButton)
        toolbarActions.add(logoutButton)

        val toolbarLeft = JPanel()
        toolbarLeft.layout = BoxLayout(toolbarLeft, BoxLayout.Y_AXIS)
        toolbarLeft.isOpaque = false
        toolbarLeft.add(workspaceLabel)
        toolbarLeft.add(connectedLabel)

        val toolbarInner = JPanel(BorderLayout())
        toolbarInner.isOpaque = false
        toolbarInner.add(toolbarLeft, BorderLayout.WEST)
        toolbarInner.add(toolbarActions, BorderLayout.EAST)
        toolbar.add(toolbarInner, BorderLayout.CENTER)

        configureTaskViewSwitcher()

        val nav = JPanel(FlowLayout(FlowLayout.LEFT, 8, 6))
        nav.isOpaque = false
        nav.add(viewMyTasksButton)
        nav.add(viewProjectTasksButton)

        tasksCards.isOpaque = false
        tasksCards.add(myTasksPanel.component, CARD_MY_TASKS)
        tasksCards.add(projectTasksPanel.component, CARD_PROJECT_TASKS)
        switchTaskView(CARD_MY_TASKS)

        val split = JBSplitter(false, 0.44f)
        split.firstComponent = tasksCards
        split.secondComponent = detailsPanel.component

        val center = JPanel(BorderLayout())
        center.isOpaque = false
        center.border = BorderFactory.createEmptyBorder(6, 0, 0, 0)
        center.add(nav, BorderLayout.NORTH)
        center.add(split, BorderLayout.CENTER)

        panel.add(toolbar, BorderLayout.NORTH)
        panel.add(center, BorderLayout.CENTER)
        return panel
    }

    private fun doBrowserLogin(project: Project) {
        val baseUrl = baseUrlField.text.trim()
        if (baseUrl.isBlank()) {
            loginStatusLabel.text = "API Base URL is required."
            return
        }
        auth.setBaseUrl(baseUrl)

        loginButton.isEnabled = false
        loginStatusLabel.text = "Opening browser for authentication..."

        ApplicationManager.getApplication().executeOnPooledThread {
            val server = runCatching { startCallbackServer(project) }.getOrElse {
                ApplicationManager.getApplication().invokeLater {
                    loginButton.isEnabled = true
                    loginStatusLabel.text = "Failed to start callback server: ${it.message}"
                    showFallbackTokenEntry("Callback server failed. Paste token manually.")
                }
                return@executeOnPooledThread
            }

            val callbackUrl = "http://127.0.0.1:${server.address.port}/callback"
            val state = randomState()
            val authUrl = buildAuthUrl(callbackUrl, state)

            BrowserUtil.browse(authUrl)
            ApplicationManager.getApplication().invokeLater {
                loginStatusLabel.text = "Waiting for browser verification..."
            }
        }
    }

    private fun startCallbackServer(project: Project): HttpServer {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.executor = Executors.newSingleThreadExecutor()
        server.createContext("/callback") { exchange ->
            val query = exchange.requestURI?.rawQuery.orEmpty()
            val params = parseQuery(query)
            val tokenFromQuery = params["token"] ?: params["access_token"]
            val code = params["code"]
            val state = params["state"]

            var responseText: String
            var responseCode: Int
            try {
                val token = when {
                    !tokenFromQuery.isNullOrBlank() -> tokenFromQuery
                    !code.isNullOrBlank() -> api.exchangeIdeCode(code, state).token
                    else -> null
                }

                if (!token.isNullOrBlank()) {
                    auth.setToken(token)
                    responseText = "Authentication successful. You can return to WebStorm."
                    responseCode = 200
                    ApplicationManager.getApplication().invokeLater {
                        loginButton.isEnabled = true
                        loginStatusLabel.text = " "
                        hideFallbackTokenEntry()
                        switchToApp()
                        refreshAll()
                    }
                } else {
                    responseText = "Authentication failed: token/code not found."
                    responseCode = 400
                    ApplicationManager.getApplication().invokeLater {
                        loginButton.isEnabled = true
                        loginStatusLabel.text = "Authentication failed. Try again."
                        showFallbackTokenEntry("No token returned. Paste token manually.")
                    }
                }
            } catch (t: Throwable) {
                responseText = "Authentication failed: ${t.message}"
                responseCode = 500
                ApplicationManager.getApplication().invokeLater {
                    loginButton.isEnabled = true
                    loginStatusLabel.text = "Authentication failed."
                    showFallbackTokenEntry("Callback error. Paste token manually.")
                    Messages.showErrorDialog(project, responseText, "DevManager Login Failed")
                }
            } finally {
                ApplicationManager.getApplication().executeOnPooledThread {
                    Thread.sleep(500)
                    server.stop(0)
                }
            }

            val bytes = responseText.toByteArray(StandardCharsets.UTF_8)
            exchange.responseHeaders.add("Content-Type", "text/plain; charset=utf-8")
            exchange.sendResponseHeaders(responseCode, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        return server
    }

    private fun buildAuthUrl(callbackUrl: String, state: String): String {
        val callback = URLEncoder.encode(callbackUrl, StandardCharsets.UTF_8)
        val encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8)
        return "https://beta.devregion.com/?ide=webstorm&redirect_uri=$callback&state=$encodedState"
    }

    private fun parseQuery(query: String): Map<String, String> {
        if (query.isBlank()) return emptyMap()
        return query.split("&").mapNotNull { part ->
            val idx = part.indexOf('=')
            if (idx <= 0) return@mapNotNull null
            val k = URLDecoder.decode(part.substring(0, idx), StandardCharsets.UTF_8)
            val v = URLDecoder.decode(part.substring(idx + 1), StandardCharsets.UTF_8)
            k to v
        }.toMap()
    }

    private fun randomState(): String {
        val bytes = ByteArray(12)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun refreshAll() {
        myTasksPanel.refresh()
        projectTasksPanel.refresh()
    }

    private fun switchToLogin() {
        connectedLabel.text = ""
        hideFallbackTokenEntry()
        cardLayout.show(cards, CARD_LOGIN)
    }

    private fun switchToApp() {
        val base = auth.getBaseUrl().trim()
        connectedLabel.text = "Connected: $base"
        cardLayout.show(cards, CARD_APP)
    }

    companion object {
        private const val CARD_LOGIN = "login"
        private const val CARD_APP = "app"
        private const val CARD_MY_TASKS = "myTasks"
        private const val CARD_PROJECT_TASKS = "projectTasks"
    }

    private fun configureFallbackPanel() {
        fallbackPanel.isOpaque = false
        fallbackPanel.isVisible = false
        fallbackPanel.alignmentX = JComponent.LEFT_ALIGNMENT
        fallbackPanel.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(ModernUi.warning),
            BorderFactory.createEmptyBorder(8, 8, 8, 8)
        )
        ModernUi.styleInput(fallbackTokenField)
        ModernUi.styleSecondary(applyFallbackTokenButton)

        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(4, 0, 4, 0)
            weightx = 1.0
            gridx = 0
            gridy = 0
        }
        val fallbackLabel = JLabel("Manual token fallback")
        fallbackLabel.foreground = ModernUi.textMuted
        fallbackPanel.add(fallbackLabel, gbc)
        gbc.gridy = 1
        fallbackPanel.add(fallbackTokenField, gbc)
        gbc.gridy = 2
        gbc.weightx = 0.0
        fallbackPanel.add(applyFallbackTokenButton, gbc)
    }

    private fun showFallbackTokenEntry(message: String) {
        loginStatusLabel.text = message
        fallbackPanel.isVisible = true
        fallbackPanel.revalidate()
        fallbackPanel.repaint()
    }

    private fun hideFallbackTokenEntry() {
        fallbackPanel.isVisible = false
        fallbackTokenField.text = ""
    }

    private fun configureTaskViewSwitcher() {
        ModernUi.styleSecondary(viewMyTasksButton)
        ModernUi.styleSecondary(viewProjectTasksButton)
        val group = ButtonGroup()
        group.add(viewMyTasksButton)
        group.add(viewProjectTasksButton)
        viewMyTasksButton.isSelected = true
    }

    private fun switchTaskView(card: String) {
        tasksCardLayout.show(tasksCards, card)
        if (card == CARD_MY_TASKS) {
            viewMyTasksButton.isSelected = true
            viewMyTasksButton.background = ModernUi.accent
            viewProjectTasksButton.background = ModernUi.accentMuted
        } else {
            viewProjectTasksButton.isSelected = true
            viewProjectTasksButton.background = ModernUi.accent
            viewMyTasksButton.background = ModernUi.accentMuted
        }
        viewMyTasksButton.foreground = Color.WHITE
        viewProjectTasksButton.foreground = Color.WHITE
    }
}
