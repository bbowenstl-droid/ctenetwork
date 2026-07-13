
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, set, update, push, remove, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

export async function connectCTE() {
  const cfg = window.CTE_FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey === "PASTE_HERE") {
    throw new Error("Firebase is not configured yet.");
  }
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  const db = getDatabase(app);
  const room = window.CTE_ROOM_CODE || "cte-2026-rookie-draft";
  return {
    db, room,
    roomRef: ref(db, `rooms/${room}`),
    picksRef: ref(db, `rooms/${room}/picks`),
    metaRef: ref(db, `rooms/${room}/meta`),
    historyRef: ref(db, `rooms/${room}/history`),
    ref, onValue, set, update, push, remove, get
  };
}
