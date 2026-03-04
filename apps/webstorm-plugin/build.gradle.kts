plugins {
    kotlin("jvm") version "1.9.25"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = "com.devmanager"
version = "0.1.1"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    implementation("com.google.code.gson:gson:2.11.0")
    intellijPlatform {
        webstorm("2024.2")
        bundledPlugin("Git4Idea")
    }
}

tasks {
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    intellijPlatform {
        pluginConfiguration {
            ideaVersion {
                sinceBuild.set("242")
                untilBuild.set("253.*")
            }
        }
    }
}
