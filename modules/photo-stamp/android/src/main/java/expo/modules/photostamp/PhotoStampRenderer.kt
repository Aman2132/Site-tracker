package expo.modules.photostamp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Typeface
import android.media.ExifInterface
import android.net.Uri
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.io.File
import java.util.UUID
import kotlin.math.roundToInt

/** Draws a full-resolution, upright JPEG with a footer outside the captured scene. */
internal object PhotoStampRenderer {
  fun render(uri: String, text: String, options: Map<String, Double>, cacheDir: File): Map<String, Any> {
    require(Uri.parse(uri).scheme == "file") { "A local capture is required" }
    val path = requireNotNull(Uri.parse(uri).path)
    val source = requireNotNull(BitmapFactory.decodeFile(path)) { "Cannot decode capture" }
    var output: Bitmap? = null
    val file = File(cacheDir, "photo-stamp-${UUID.randomUUID()}.jpg")
    try {
      val exif = ExifInterface(path)
      val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      val swapped = orientation in 5..8
      val width = if (swapped) source.height else source.width
      val photoHeight = if (swapped) source.width else source.height
      val padding = (width * options.getValue("paddingFraction")).roundToInt().coerceAtLeast(1)
      val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = (width * options.getValue("fontFraction")).toFloat().coerceAtLeast(1f)
        typeface = Typeface.create("sans-serif", Typeface.NORMAL)
      }
      val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, (width - padding * 2).coerceAtLeast(1))
        .setAlignment(Layout.Alignment.ALIGN_NORMAL)
        .setIncludePad(true)
        .setLineSpacing(0f, options.getValue("lineSpacing").toFloat())
        .build()
      val height = photoHeight + layout.height + padding * 2
      val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      output = bitmap
      val canvas = Canvas(bitmap)
      canvas.drawColor(Color.BLACK)
      canvas.drawBitmap(source, orientationMatrix(orientation, source.width, source.height), Paint(Paint.FILTER_BITMAP_FLAG))
      canvas.save()
      canvas.translate(padding.toFloat(), (photoHeight + padding).toFloat())
      layout.draw(canvas)
      canvas.restore()
      file.outputStream().use {
        check(bitmap.compress(Bitmap.CompressFormat.JPEG, options.getValue("jpegQuality").roundToInt(), it)) {
          "Cannot write stamped JPEG"
        }
      }
      // Keep camera/GPS metadata, but pixels are now upright and have a different height.
      val savedExif = ExifInterface(file.absolutePath)
      for (tag in preservedTags) exif.getAttribute(tag)?.let { savedExif.setAttribute(tag, it) }
      savedExif.setAttribute(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL.toString())
      savedExif.setAttribute(ExifInterface.TAG_IMAGE_WIDTH, width.toString())
      savedExif.setAttribute(ExifInterface.TAG_IMAGE_LENGTH, height.toString())
      savedExif.setAttribute(ExifInterface.TAG_PIXEL_X_DIMENSION, width.toString())
      savedExif.setAttribute(ExifInterface.TAG_PIXEL_Y_DIMENSION, height.toString())
      savedExif.saveAttributes()
      return mapOf("uri" to Uri.fromFile(file).toString(), "width" to width, "height" to height)
    } catch (error: Throwable) {
      file.delete()
      throw error
    } finally {
      source.recycle()
      output?.recycle()
    }
  }

  private fun orientationMatrix(orientation: Int, width: Int, height: Int) = Matrix().apply {
    val w = width.toFloat()
    val h = height.toFloat()
    val values = when (orientation) {
      2 -> floatArrayOf(-1f, 0f, w, 0f, 1f, 0f, 0f, 0f, 1f)
      3 -> floatArrayOf(-1f, 0f, w, 0f, -1f, h, 0f, 0f, 1f)
      4 -> floatArrayOf(1f, 0f, 0f, 0f, -1f, h, 0f, 0f, 1f)
      5 -> floatArrayOf(0f, 1f, 0f, 1f, 0f, 0f, 0f, 0f, 1f)
      6 -> floatArrayOf(0f, -1f, h, 1f, 0f, 0f, 0f, 0f, 1f)
      7 -> floatArrayOf(0f, -1f, h, -1f, 0f, w, 0f, 0f, 1f)
      8 -> floatArrayOf(0f, 1f, 0f, -1f, 0f, w, 0f, 0f, 1f)
      else -> floatArrayOf(1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f)
    }
    setValues(values)
  }

  private val preservedTags = listOf(
    ExifInterface.TAG_MAKE, ExifInterface.TAG_MODEL, ExifInterface.TAG_DATETIME,
    ExifInterface.TAG_DATETIME_ORIGINAL, ExifInterface.TAG_DATETIME_DIGITIZED,
    ExifInterface.TAG_EXPOSURE_TIME, ExifInterface.TAG_F_NUMBER, ExifInterface.TAG_FOCAL_LENGTH,
    ExifInterface.TAG_GPS_LATITUDE, ExifInterface.TAG_GPS_LATITUDE_REF,
    ExifInterface.TAG_GPS_LONGITUDE, ExifInterface.TAG_GPS_LONGITUDE_REF,
    ExifInterface.TAG_GPS_ALTITUDE, ExifInterface.TAG_GPS_ALTITUDE_REF,
    ExifInterface.TAG_GPS_TIMESTAMP, ExifInterface.TAG_GPS_DATESTAMP,
    ExifInterface.TAG_GPS_IMG_DIRECTION, ExifInterface.TAG_GPS_IMG_DIRECTION_REF
  )
}
