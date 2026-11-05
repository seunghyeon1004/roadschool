import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The web prototype (../index.html, ../report.html, ../css, ../js) is the UI. It is copied into the APK assets at build time.
val syncWeb by tasks.registering(Copy::class) {
    from("${rootDir}/..") { include("index.html", "report.html", "css/**", "js/**") }
    into(layout.buildDirectory.dir("generated/web-assets/web"))
}

android {
    namespace = "com.roadschool.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.roadschool.app"
        minSdk = 28                 // contest guide / 기획서: Android API 28+
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-proto"
    }

    val ksFile = rootProject.file("keystore.properties")
    if (ksFile.exists()) {
        val p = Properties().apply { ksFile.inputStream().use { load(it) } }
        signingConfigs.create("release") {
            storeFile = rootProject.file(p.getProperty("storeFile"))
            storePassword = p.getProperty("storePassword")
            keyAlias = p.getProperty("keyAlias")
            keyPassword = p.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/web-assets"))
}

tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(syncWeb) }
tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }.configureEach { dependsOn(syncWeb) }

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    testImplementation("junit:junit:4.13.2")
}
