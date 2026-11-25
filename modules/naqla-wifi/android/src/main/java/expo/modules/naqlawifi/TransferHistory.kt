package expo.modules.naqlawifi

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class HistoryEntry(
  val id: String,
  val direction: String,
  val name: String,
  val size: Long,
  val uri: String?,
  val mimeType: String,
  val status: String,
  val timestamp: Long,
)

private fun entryToJson(e: HistoryEntry): JSONObject =
  JSONObject()
    .put("id", e.id)
    .put("direction", e.direction)
    .put("name", e.name)
    .put("size", e.size)
    .put("uri", e.uri ?: JSONObject.NULL)
    .put("mimeType", e.mimeType)
    .put("status", e.status)
    .put("timestamp", e.timestamp)

private fun entryFromJson(o: JSONObject): HistoryEntry =
  HistoryEntry(
    id = o.optString("id"),
    direction = o.optString("direction"),
    name = o.optString("name"),
    size = o.optLong("size"),
    uri = if (o.isNull("uri")) null else o.optString("uri"),
    mimeType = o.optString("mimeType"),
    status = o.optString("status"),
    timestamp = o.optLong("timestamp"),
  )

class TransferHistory private constructor(context: Context) {

  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  @Synchronized
  fun record(
    direction: String,
    name: String,
    size: Long,
    uri: String?,
    mimeType: String,
    status: String = "completed",
  ): HistoryEntry {
    val entry = HistoryEntry(
      id = UUID.randomUUID().toString(),
      direction = direction,
      name = name,
      size = size,
      uri = uri,
      mimeType = mimeType,
      status = status,
      timestamp = System.currentTimeMillis(),
    )
    val arr = JSONArray(prefs.getString(KEY_ENTRIES, "[]") ?: "[]")
    arr.put(0, entryToJson(entry))
    while (arr.length() > MAX_ENTRIES) {
      arr.remove(arr.length() - 1)
    }
    prefs.edit().putString(KEY_ENTRIES, arr.toString()).apply()
    return entry
  }

  @Synchronized
  fun getAll(): List<HistoryEntry> {
    val arr = JSONArray(prefs.getString(KEY_ENTRIES, "[]") ?: "[]")
    val list = ArrayList<HistoryEntry>(arr.length())
    for (i in 0 until arr.length()) {
      list.add(entryFromJson(arr.getJSONObject(i)))
    }
    return list
  }

  @Synchronized
  fun clear() {
    prefs.edit().remove(KEY_ENTRIES).apply()
  }

  companion object {
    private const val PREFS_NAME = "wavo_history"
    private const val KEY_ENTRIES = "entries"
    private const val MAX_ENTRIES = 300

    @Volatile
    private var instance: TransferHistory? = null

    fun get(context: Context): TransferHistory =
      instance ?: synchronized(this) {
        instance ?: TransferHistory(context.applicationContext).also { instance = it }
      }
  }
}
