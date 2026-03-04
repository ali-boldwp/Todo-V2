package com.devmanager.plugin.ui

import com.intellij.ui.JBColor
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.Color
import java.awt.Dimension
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.geom.RoundRectangle2D
import javax.swing.AbstractButton
import javax.swing.BorderFactory
import javax.swing.JButton
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JTextField

object ModernUi {
    val rootBg = JBColor(Color(0x0E1218), Color(0x0E1218))
    val panelBg = JBColor(Color(0x151C26), Color(0x151C26))
    val panelBgAlt = JBColor(Color(0x111822), Color(0x111822))
    val border = JBColor(Color(0x2A3344), Color(0x2A3344))
    val textMuted = JBColor(Color(0x97A5BC), Color(0x97A5BC))
    val textStrong = JBColor(Color(0xE5ECF8), Color(0xE5ECF8))
    val accent = JBColor(Color(0x4EA1FF), Color(0x4EA1FF))
    val accentMuted = JBColor(Color(0x243A5A), Color(0x243A5A))
    val success = JBColor(Color(0x2DC08D), Color(0x2DC08D))
    val warning = JBColor(Color(0xF2A74B), Color(0xF2A74B))
    val danger = JBColor(Color(0xE35D6A), Color(0xE35D6A))

    fun styleRoot(component: JComponent) {
        component.background = rootBg
        component.foreground = textStrong
    }

    fun stylePanel(component: JComponent, padding: Int = 10) {
        component.background = panelBg
        component.foreground = textStrong
        component.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(border),
            JBUI.Borders.empty(padding)
        )
    }

    fun styleInput(field: JTextField) {
        field.background = panelBgAlt
        field.foreground = textStrong
        field.caretColor = textStrong
        field.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(border),
            JBUI.Borders.empty(6, 10)
        )
        field.preferredSize = Dimension(field.preferredSize.width, 34)
    }

    fun styleCombo(combo: JComboBox<*>) {
        combo.background = panelBgAlt
        combo.foreground = textStrong
        combo.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(border),
            JBUI.Borders.empty(2, 8)
        )
        combo.preferredSize = Dimension(combo.preferredSize.width.coerceAtLeast(120), 34)
    }

    fun stylePrimary(button: AbstractButton) {
        button.background = accent
        button.foreground = Color.WHITE
        button.isOpaque = true
        button.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(accent.brighter()),
            JBUI.Borders.empty(6, 14)
        )
        button.isFocusPainted = false
    }

    fun styleSecondary(button: AbstractButton) {
        button.background = accentMuted
        button.foreground = textStrong
        button.isOpaque = true
        button.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(border),
            JBUI.Borders.empty(6, 14)
        )
        button.isFocusPainted = false
    }

    fun styleDanger(button: JButton) {
        button.background = danger
        button.foreground = Color.WHITE
        button.isOpaque = true
        button.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(danger.brighter()),
            JBUI.Borders.empty(6, 14)
        )
        button.isFocusPainted = false
    }
}

class GradientPanel(
    private val start: Color,
    private val end: Color,
    private val radius: Float = 18f
) : JPanel(BorderLayout()) {
    init {
        isOpaque = false
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.paint = java.awt.GradientPaint(0f, 0f, start, width.toFloat(), height.toFloat(), end)
        g2.fill(RoundRectangle2D.Float(0f, 0f, width - 1f, height - 1f, radius, radius))
        g2.color = ModernUi.border
        g2.draw(RoundRectangle2D.Float(0f, 0f, width - 1f, height - 1f, radius, radius))
        g2.dispose()
        super.paintComponent(g)
    }
}
