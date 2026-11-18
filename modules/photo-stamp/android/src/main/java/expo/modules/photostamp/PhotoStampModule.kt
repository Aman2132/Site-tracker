package expo.modules.photostamp

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PhotoStampModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PhotoStamp")

    // Expo runs AsyncFunction off the JS/UI thread. Images never cross the bridge as base64.
    AsyncFunction("renderAsync") { uri: String, text: String, options: Map<String, Double> ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      PhotoStampRenderer.render(uri, text, options, context.cacheDir)
    }
  }
}
