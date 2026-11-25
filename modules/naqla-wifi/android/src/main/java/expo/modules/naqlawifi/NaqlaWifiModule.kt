package expo.modules.naqlawifi

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Inet4Address
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject

private data class SharedFile(
  val uri: Uri,
  val name: String,
  val size: Long,
  val mimeType: String,
)

private data class HotspotResult(
  val ssid: String,
  val password: String,
  val port: Int,
  val token: String,
)

class NaqlaWifiModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "React context is unavailable", null)

  private val connectivityManager: ConnectivityManager
    get() = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

  private val wifiManager: WifiManager
    get() = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

  private val history: TransferHistory
    get() = TransferHistory.get(context)

  private val sharedFiles = mutableListOf<SharedFile>()
  private var serverSocket: ServerSocket? = null
  private var serverExecutor: ThreadPoolExecutor? = null
  private var serverThread: Thread? = null
  private var serverToken: String? = null
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  private var boundNetwork: Network? = null

  override fun definition() = ModuleDefinition {
    Name("NaQlaWifi")

    Events("onHotspotEvent", "onServerEvent", "onTransferProgress")

    OnDestroy {
      stopServerInternal()
      disconnectNetworkInternal()
    }

    AsyncFunction("setSharedFiles") { json: String ->
      val arr = JSONArray(json)
      sharedFiles.clear()
      val resolved = mutableListOf<Map<String, Any>>()
      for (i in 0 until arr.length()) {
        val item = arr.getJSONObject(i)
        val uri = Uri.parse(item.getString("uri"))
        val resolver = context.contentResolver
        val mimeType = resolver.getType(uri) ?: "application/octet-stream"
        val size = try {
          resolver.openAssetFileDescriptor(uri, "r")?.use { it.length } ?: -1L
        } catch (_: Exception) {
          -1L
        }
        var name = item.optString("name")
        if (name.isEmpty()) name = displayNameOf(uri) ?: "file-$i"
        val file = SharedFile(uri, name, if (size >= 0) size else 0L, mimeType)
        sharedFiles.add(file)
        resolved.add(
          mapOf(
            "uri" to uri.toString(),
            "name" to file.name,
            "size" to file.size,
            "mimeType" to file.mimeType,
          )
        )
      }
      resolved
    }

    AsyncFunction("startHotspot") { ->
      ensureHotspotPermission()
      val result = withTimeout(HOTSPOT_TIMEOUT_MS) {
        suspendCancellableCoroutine<HotspotResult> { cont ->
          val handler = Handler(Looper.getMainLooper())
          val callback = object : WifiManager.LocalOnlyHotspotCallback() {
            override fun onStarted(configuration: WifiConfiguration?) {
              try {
                val softAp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) wifiManager.softApConfiguration else null
                val ssid = (softAp?.ssid ?: configuration?.ssid ?: "").trim('"')
                val password = (softAp?.passphrase ?: configuration?.preSharedKey ?: "").trim('"')
                if (ssid.isEmpty()) {
                  if (cont.isActive) cont.resumeWithException(CodedException("HOTSPOT_FAILED", "Hotspot started without an SSID", null))
                  return
                }
                val token = generateToken()
                serverToken = token
                if (cont.isActive) cont.resume(HotspotResult(ssid, password, DEFAULT_PORT, token))
              } catch (e: Exception) {
                if (cont.isActive) cont.resumeWithException(e)
              }
            }

            override fun onStopped() {
              sendEvent("onHotspotEvent", bundleOf("state" to "stopped"))
            }

            override fun onFailed(reason: Int) {
              sendEvent("onHotspotEvent", bundleOf("state" to "failed", "reason" to reason))
              if (cont.isActive) cont.resumeWithException(CodedException("HOTSPOT_FAILED", "LocalOnlyHotspot failed (reason $reason)", null))
            }
          }
          try {
            wifiManager.startLocalOnlyHotspot(callback, handler)
          } catch (e: Exception) {
            if (cont.isActive) cont.resumeWithException(CodedException("HOTSPOT_FAILED", e.message ?: "startLocalOnlyHotspot failed", e))
          }
          cont.invokeOnCancellation {
            try {
              @Suppress("DEPRECATION")
              wifiManager.stopLocalOnlyHotspot()
            } catch (_: Exception) {
            }
          }
        }
      }
      mapOf(
        "ssid" to result.ssid,
        "password" to result.password,
        "port" to result.port,
        "token" to result.token,
      )
    }

    AsyncFunction("startTransferServer") { token: String, port: Int ->
      stopServerInternal()
      val socket = ServerSocket()
      socket.reuseAddress = true
      socket.bind(InetSocketAddress("0.0.0.0", port))
      val executor = ThreadPoolExecutor(4, 4, 30L, TimeUnit.SECONDS, LinkedBlockingQueue())
      serverSocket = socket
      serverExecutor = executor
      serverToken = token.lowercase()
      val acceptThread = thread {
        while (!socket.isClosed) {
          try {
            val client = socket.accept()
            executor.execute { handleClient(client) }
          } catch (e: Exception) {
            if (!socket.isClosed) {
              sendEvent("onServerEvent", bundleOf("error" to (e.message ?: "accept failed")))
            }
          }
        }
      }
      acceptThread.isDaemon = true
      serverThread = acceptThread
      acceptThread.start()
      true
    }

    AsyncFunction("stopTransferServer") { ->
      stopServerInternal()
      true
    }

    AsyncFunction("stopHotspot") { ->
      try {
        @Suppress("DEPRECATION")
        wifiManager.stopLocalOnlyHotspot()
      } catch (_: Exception) {
      }
      true
    }

    AsyncFunction("joinNetwork") { ssid: String, password: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw CodedException("UNSUPPORTED_ANDROID", "Joining the sender network requires Android 10 (API 29) or newer", null)
      }
      disconnectNetworkInternal()
      val specifier = WifiNetworkSpecifier.Builder()
        .setSsid(ssid)
        .setWpa2Passphrase(password)
        .build()
      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(specifier)
        .build()
      withTimeout(JOIN_TIMEOUT_MS) {
        suspendCancellableCoroutine<String> { cont ->
          var resolvedHost: String? = null
          val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
              try {
                connectivityManager.bindProcessToNetwork(network)
              } catch (_: Exception) {
              }
              boundNetwork = network
              val host = extractHost(connectivityManager.getLinkProperties(network))
              if (host != null) {
                resolvedHost = host
                if (cont.isActive) cont.resume(host)
              }
            }

            override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
              if (network != boundNetwork) return
              if (resolvedHost == null) {
                val host = extractHost(linkProperties)
                if (host != null) {
                  resolvedHost = host
                  if (cont.isActive) cont.resume(host)
                }
              }
            }

            override fun onUnavailable() {
              if (cont.isActive) cont.resumeWithException(CodedException("CONNECTION_FAILED", "The sender network is unavailable", null))
            }
          }
          networkCallback = callback
          try {
            connectivityManager.requestNetwork(request, callback, Handler(Looper.getMainLooper()))
          } catch (e: Exception) {
            if (cont.isActive) cont.resumeWithException(CodedException("CONNECTION_FAILED", e.message ?: "requestNetwork failed", e))
          }
          cont.invokeOnCancellation { disconnectNetworkInternal() }
        }
      }
    }

    AsyncFunction("disconnectNetwork") { ->
      disconnectNetworkInternal()
      true
    }

    AsyncFunction("fetchManifest") { host: String, token: String, port: Int ->
      val connection = URL("http://$host:$port/manifest?token=$token").openConnection() as HttpURLConnection
      connection.connectTimeout = 10000
      connection.readTimeout = 15000
      connection.requestMethod = "GET"
      try {
        val code = connection.responseCode
        if (code == 403) throw CodedException("FORBIDDEN", "The sender rejected the session token", null)
        if (code != 200) throw CodedException("CONNECTION_FAILED", "Manifest request failed with HTTP $code", null)
        val text = connection.inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
        val arr = JSONArray(text)
        val list = mutableListOf<Map<String, Any>>()
        for (i in 0 until arr.length()) {
          val item = arr.getJSONObject(i)
          list.add(
            mapOf(
              "index" to item.optInt("index", i),
              "name" to item.optString("name"),
              "size" to item.optLong("size"),
              "mimeType" to item.optString("mimeType"),
            )
          )
        }
        list
      } finally {
        connection.disconnect()
      }
    }

    AsyncFunction("downloadFile") { host: String, token: String, port: Int, index: Int, name: String, size: Long, mimeType: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw CodedException("UNSUPPORTED_ANDROID", "Saving received files requires Android 10 (API 29) or newer", null)
      }
      val safeName = sanitizeFileName(name).ifEmpty { "file-$index" }
      val (partFile, totalWritten) = downloadInternal(host, token, port, index, safeName, size, 0)
      val resolver = context.contentResolver
      val displayName = uniqueDisplayName(resolver, safeName)
      val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, displayName)
        put(MediaStore.Downloads.MIME_TYPE, mimeType)
        if (size > 0) put(MediaStore.Downloads.SIZE, size)
        put(MediaStore.Downloads.RELATIVE_PATH, DOWNLOAD_RELATIVE_PATH)
        put(MediaStore.Downloads.IS_PENDING, 1)
      }
      val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        ?: throw CodedException("SAVE_FAILED", "Could not create the file in Downloads/Naqla", null)
      try {
        val pfd = resolver.openFileDescriptor(uri, "w")
          ?: throw CodedException("SAVE_FAILED", "Could not open the destination file", null)
        val output = ParcelFileDescriptor.AutoCloseOutputStream(pfd)
        partFile.inputStream().use { input ->
          val buffer = ByteArray(BUFFER_SIZE)
          var n = input.read(buffer)
          while (n != -1) {
            output.write(buffer, 0, n)
            n = input.read(buffer)
          }
        }
        output.flush()
        pfd.fileDescriptor.sync()
        output.close()
        resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
      } catch (e: Exception) {
        try {
          resolver.delete(uri, null, null)
        } catch (_: Exception) {
        }
        throw e
      }
      partFile.delete()
      history.record("received", displayName, totalWritten, uri.toString(), mimeType, "completed")
      mapOf(
        "uri" to uri.toString(),
        "name" to displayName,
        "mimeType" to mimeType,
      )
    }

    AsyncFunction("openSavedFile") { uri: String, mimeType: String? ->
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(Uri.parse(uri), mimeType ?: "*/*")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      launchIntent(intent)
    }

    AsyncFunction("shareSavedFile") { uri: String, mimeType: String? ->
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType ?: "*/*"
        putExtra(Intent.EXTRA_STREAM, Uri.parse(uri))
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      launchIntent(Intent.createChooser(intent, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("getHistory") { ->
      history.getAll().map { e ->
        mapOf(
          "id" to e.id,
          "direction" to e.direction,
          "name" to e.name,
          "size" to e.size,
          "uri" to e.uri,
          "mimeType" to e.mimeType,
          "status" to e.status,
          "timestamp" to e.timestamp,
        )
      }
    }

    AsyncFunction("clearHistory") { ->
      history.clear()
      true
    }

    AsyncFunction("getPermissionStates") { ->
      fun granted(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
      val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val locationServices = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        locationManager.isLocationEnabled
      } else {
        @Suppress("DEPRECATION")
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
          locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
      }
      mapOf(
        "wifi" to if (Build.VERSION.SDK_INT >= 33) granted(Manifest.permission.NEARBY_WIFI_DEVICES) else granted(Manifest.permission.ACCESS_FINE_LOCATION),
        "camera" to granted(Manifest.permission.CAMERA),
        "locationServices" to locationServices,
        "bluetooth" to (Build.VERSION.SDK_INT < 31 || granted(Manifest.permission.BLUETOOTH_CONNECT)),
      )
    }

    AsyncFunction("openLocationSettings") { ->
      context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }
  }

  private fun ensureHotspotPermission() {
    val permission = if (Build.VERSION.SDK_INT >= 33) {
      Manifest.permission.NEARBY_WIFI_DEVICES
    } else {
      Manifest.permission.ACCESS_FINE_LOCATION
    }
    if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
      throw CodedException("PERMISSION_DENIED", "Missing permission: $permission", null)
    }
  }

  private fun extractHost(linkProperties: LinkProperties?): String? {
    if (linkProperties == null) return null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val dhcp = linkProperties.dhcpServerAddress
      if (dhcp is Inet4Address) return dhcp.hostAddress
    }
    for (route in linkProperties.routes) {
      val gateway = route.gateway
      if (gateway is Inet4Address) return gateway.hostAddress
    }
    return null
  }

  private fun disconnectNetworkInternal() {
    networkCallback?.let {
      try {
        connectivityManager.unregisterNetworkCallback(it)
      } catch (_: Exception) {
      }
    }
    networkCallback = null
    try {
      connectivityManager.bindProcessToNetwork(null)
    } catch (_: Exception) {
    }
    boundNetwork = null
  }

  private fun stopServerInternal() {
    try {
      serverSocket?.close()
    } catch (_: Exception) {
    }
    serverSocket = null
    serverExecutor?.shutdownNow()
    serverExecutor = null
    serverThread = null
    serverToken = null
  }

  private fun handleClient(client: Socket) {
    try {
      client.soTimeout = 30000
      val input = client.getInputStream()
      val output = client.getOutputStream()
      val reader = BufferedReader(InputStreamReader(input, Charsets.ISO_8859_1))
      val requestLine = reader.readLine() ?: return
      val parts = requestLine.split(" ")
      if (parts.size < 2 || parts[0] != "GET") {
        writeSimpleResponse(output, 405, "Method Not Allowed", "text/plain", "method not allowed")
        return
      }
      val headers = mutableMapOf<String, String>()
      var line = reader.readLine()
      while (line != null && line.isNotEmpty()) {
        val idx = line.indexOf(':')
        if (idx > 0) headers[line.substring(0, idx).trim().lowercase()] = line.substring(idx + 1).trim()
        line = reader.readLine()
      }
      val fullPath = parts[1]
      val cleanPath = fullPath.substringBefore('?')
      val query = parseQuery(fullPath.substringAfter('?', ""))
      val token = query["token"]?.lowercase()
      if (token == null || token != serverToken) {
        writeSimpleResponse(output, 403, "Forbidden", "text/plain", "forbidden")
        return
      }
      when {
        cleanPath == "/manifest" -> {
          val arr = JSONArray()
          sharedFiles.forEachIndexed { i, file ->
            arr.put(
              JSONObject()
                .put("index", i)
                .put("name", file.name)
                .put("size", file.size)
                .put("mimeType", file.mimeType)
            )
          }
          writeSimpleResponse(output, 200, "OK", "application/json", arr.toString())
        }
        cleanPath.startsWith("/file/") -> {
          val index = cleanPath.removePrefix("/file/").toIntOrNull()
          val file = if (index != null) sharedFiles.getOrNull(index) else null
          if (file == null) {
            writeSimpleResponse(output, 404, "Not Found", "text/plain", "not found")
          } else {
            streamFile(output, file, query, headers)
          }
        }
        else -> writeSimpleResponse(output, 404, "Not Found", "text/plain", "not found")
      }
    } catch (e: Exception) {
      sendEvent("onServerEvent", bundleOf("error" to (e.message ?: "request failed")))
    } finally {
      try {
        client.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun streamFile(output: OutputStream, file: SharedFile, query: Map<String, String>, headers: Map<String, String>) {
    val total = file.size
    var offset = query["offset"]?.toLongOrNull() ?: 0L
    val rangeHeader = headers["range"]
    if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
      val rangeStart = rangeHeader.removePrefix("bytes=").substringBefore('-').toLongOrNull()
      if (rangeStart != null && rangeStart > offset) offset = rangeStart
    }
    if (offset < 0) offset = 0L
    if (total > 0 && offset >= total) {
      writeSimpleResponse(output, 416, "Range Not Satisfiable", "text/plain", "range not satisfiable")
      return
    }
    val input = try {
      context.contentResolver.openInputStream(file.uri)
    } catch (_: Exception) {
      null
    }
    if (input == null) {
      writeSimpleResponse(output, 404, "Not Found", "text/plain", "cannot open file")
      return
    }
    input.use {
      if (offset > 0) skipFully(it, offset)
      val status = if (offset > 0) 206 else 200
      val reason = if (offset > 0) "Partial Content" else "OK"
      val head = StringBuilder()
      head.append("HTTP/1.1 $status $reason\r\n")
      head.append("Content-Type: ${file.mimeType}\r\n")
      if (total > 0) {
        val remaining = total - offset
        head.append("Content-Length: $remaining\r\n")
        if (status == 206) {
          head.append("Content-Range: bytes $offset-${total - 1}/$total\r\n")
        }
      } else {
        head.append("Connection: close\r\n")
      }
      head.append("Connection: close\r\n\r\n")
      output.write(head.toString().toByteArray(Charsets.ISO_8859_1))
      output.flush()
      val buffer = ByteArray(BUFFER_SIZE)
      var sent = 0L
      var n = it.read(buffer)
      while (n != -1) {
        output.write(buffer, 0, n)
        sent += n
        n = it.read(buffer)
      }
      output.flush()
      if (total <= 0 || offset + sent >= total) {
        history.record("sent", file.name, offset + sent, file.uri.toString(), file.mimeType, "completed")
      }
    }
  }

  private fun downloadInternal(
    host: String,
    token: String,
    port: Int,
    index: Int,
    safeName: String,
    size: Long,
    attempt: Int,
  ): Pair<File, Long> {
    val digest = sha256("$index:$safeName").substring(0, 12)
    val partFile = File(context.cacheDir, "naqla-$digest-$safeName.part")
    var offset = if (partFile.exists()) partFile.length() else 0L
    val socket = Socket()
    try {
      socket.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
      socket.soTimeout = READ_TIMEOUT_MS
      val output = socket.getOutputStream()
      val request = buildString {
        append("GET /file/$index?token=$token&offset=$offset HTTP/1.1\r\n")
        append("Host: $host:$port\r\n")
        if (offset > 0) append("Range: bytes=$offset-\r\n")
        append("Connection: close\r\n\r\n")
      }
      output.write(request.toByteArray(Charsets.ISO_8859_1))
      output.flush()
      val input = socket.getInputStream()
      val (status) = readResponseHead(input)
      when (status) {
        200 -> {
          if (offset > 0) {
            partFile.delete()
            offset = 0L
          }
        }
        206 -> Unit
        403 -> throw CodedException("FORBIDDEN", "The sender rejected the session token", null)
        416 -> {
          partFile.delete()
          if (attempt == 0) return downloadInternal(host, token, port, index, safeName, size, 1)
          throw CodedException("DOWNLOAD_FAILED", "The sender cannot resume from the stored offset", null)
        }
        else -> throw CodedException("DOWNLOAD_FAILED", "Unexpected HTTP status $status", null)
      }
      val raf = RandomAccessFile(partFile, "rw")
      raf.seek(raf.length())
      val buffer = ByteArray(BUFFER_SIZE)
      var received = 0L
      var n = input.read(buffer)
      while (n != -1) {
        raf.write(buffer, 0, n)
        received += n
        sendEvent(
          "onTransferProgress",
          bundleOf(
            "index" to index,
            "name" to safeName,
            "received" to (offset + received),
            "total" to size,
          )
        )
        n = input.read(buffer)
      }
      raf.close()
      val totalWritten = offset + received
      if (size > 0 && totalWritten < size) {
        throw CodedException("DOWNLOAD_FAILED", "Incomplete download ($totalWritten of $size bytes)", null)
      }
      return Pair(partFile, totalWritten)
    } finally {
      try {
        socket.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun readResponseHead(input: InputStream): Pair<Int, Map<String, String>> {
    val head = ByteArrayOutputStream()
    val window = IntArray(4)
    var filled = 0
    while (true) {
      val b = input.read()
      if (b == -1) break
      head.write(b)
      window[filled % 4] = b
      filled++
      if (
        filled >= 4 &&
        window[(filled - 4) % 4] == 13 &&
        window[(filled - 3) % 4] == 10 &&
        window[(filled - 2) % 4] == 13 &&
        window[(filled - 1) % 4] == 10
      ) break
    }
    val text = head.toString("ISO-8859-1")
    val lines = text.split("\r\n")
    val status = lines.getOrNull(0)?.split(" ")?.getOrNull(1)?.toIntOrNull() ?: 0
    val headers = lines.drop(1)
      .filter { it.contains(":") }
      .associate {
        val idx = it.indexOf(':')
        it.substring(0, idx).trim().lowercase() to it.substring(idx + 1).trim()
      }
    return Pair(status, headers)
  }

  private fun parseQuery(query: String): Map<String, String> {
    if (query.isEmpty()) return emptyMap()
    return query.split('&')
      .mapNotNull { pair ->
        val idx = pair.indexOf('=')
        if (idx > 0) pair.substring(0, idx) to pair.substring(idx + 1) else null
      }
      .toMap()
  }

  private fun writeSimpleResponse(output: OutputStream, status: Int, reason: String, contentType: String, body: String) {
    val bytes = body.toByteArray(Charsets.UTF_8)
    val head = "HTTP/1.1 $status $reason\r\n" +
      "Content-Type: $contentType\r\n" +
      "Content-Length: ${bytes.size}\r\n" +
      "Connection: close\r\n\r\n"
    output.write(head.toByteArray(Charsets.ISO_8859_1))
    output.write(bytes)
    output.flush()
  }

  private fun uniqueDisplayName(resolver: android.content.ContentResolver, name: String): String {
    val dot = name.lastIndexOf('.')
    val base = if (dot > 0) name.substring(0, dot) else name
    val ext = if (dot > 0) name.substring(dot) else ""
    fun exists(candidate: String): Boolean {
      val cursor = resolver.query(
        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        arrayOf(MediaStore.Downloads._ID),
        "${MediaStore.Downloads.DISPLAY_NAME} = ? AND ${MediaStore.Downloads.RELATIVE_PATH} = ?",
        arrayOf(candidate, DOWNLOAD_RELATIVE_PATH),
        null,
      )
      return cursor?.use { it.count > 0 } ?: false
    }
    if (!exists(name)) return name
    var i = 1
    while (exists("$base ($i)$ext")) i++
    return "$base ($i)$ext"
  }

  private fun launchIntent(intent: Intent) {
    try {
      context.startActivity(intent)
    } catch (e: Exception) {
      throw CodedException("NO_ACTIVITY", "No app can handle this action", e)
    }
  }

  private fun displayNameOf(uri: Uri): String? {
    return try {
      context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) cursor.getString(0) else null
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun sanitizeFileName(name: String): String =
    name.replace(Regex("[\\\\/:*?\"<>|]"), "_").trim().trim('.')

  private fun skipFully(input: InputStream, bytes: Long) {
    var remaining = bytes
    while (remaining > 0) {
      val skipped = input.skip(remaining)
      if (skipped <= 0) {
        if (input.read() == -1) return
        remaining -= 1
      } else {
        remaining -= skipped
      }
    }
  }

  private fun generateToken(): String {
    val bytes = ByteArray(32)
    SecureRandom().nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun sha256(input: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }

  companion object {
    private const val DEFAULT_PORT = 47821
    private const val BUFFER_SIZE = 256 * 1024
    private const val HOTSPOT_TIMEOUT_MS = 30_000L
    private const val JOIN_TIMEOUT_MS = 30_000L
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 30_000
    private const val DOWNLOAD_RELATIVE_PATH = "Download/Naqla/"
  }
}
