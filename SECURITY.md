# Locking down the draft board

The TV board and commissioner page share one Firebase Realtime Database. Anyone can open
`admin.html` if they know the URL, so the database rules must decide who can *write*.

## One-time setup (5 minutes)

1. On the phone you'll run the draft from, open `admin.html` on the live site.
2. Expand **Commissioner device ID** and copy the ID shown.
3. In the Firebase console: **Realtime Database → Rules**, paste this, replacing `PASTE_DEVICE_ID`:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === 'PASTE_DEVICE_ID'"
      }
    }
  }
}
```

4. Click **Publish**. The TV board can still read; only your phone can make picks.

## Good to know

- The ID belongs to that browser on that phone. If you clear Safari data or switch phones,
  repeat the steps with the new ID. To allow a backup device, use
  `auth.uid === 'ID_ONE' || auth.uid === 'ID_TWO'`.
- The Firebase `apiKey` in `firebase-config.js` is not a secret — Firebase web keys are
  meant to be public. The rules above are what actually protect the data.
- `admin.html` is not linked from any public page (TV board and Draft Central included) and asks search engines not to index it.
