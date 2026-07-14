CTE DRAFT CENTRAL V2

WHAT THIS VERSION DOES
- TV board and phone commissioner controls
- Real-time sync through Firebase
- 1-minute clock
- Enter player name, position, and NFL team from the phone
- TV updates immediately
- All 48 picks and traded-pick ownership are preloaded
- Draft history and CSV export

FILES
- index.html: landing page
- tv.html: television display
- admin.html: commissioner phone controls
- firebase-config.js: paste your Firebase web configuration here
- draft-data.js: pick ownership
- firebase-bridge.js: real-time connection
- common.css: shared styling

IMPORTANT
Phone-to-TV syncing requires this folder to be hosted online and connected to Firebase.
Opening the files directly from your computer is not enough for cross-device sync.

QUICK SETUP
1. Create a free Firebase project.
2. Add a Web App in Firebase and copy its configuration into firebase-config.js.
3. Enable Anonymous Authentication.
4. Create a Realtime Database.
5. Use these Realtime Database rules:

{
  "rules": {
    "rooms": {
      "$room": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}

6. Upload the entire folder to GitHub Pages, Netlify, or another static host.
7. Open /tv.html on the TV.
8. Open /admin.html on Brendan's phone.
9. Both screens will sync live.

SECURITY
The included setup uses anonymous Firebase sign-in. Anyone with the commissioner-control URL can edit the draft, so keep the admin URL private during draft night.


NETLIFY AUTHORIZED DOMAIN
After Netlify gives you the live site address, return to Firebase:
Authentication > Settings > Authorized domains > Add domain.
Add only the hostname, for example:
your-site-name.netlify.app

TV URL:
https://YOUR-SITE.netlify.app/tv.html

COMMISSIONER URL:
https://YOUR-SITE.netlify.app/admin.html
Keep the commissioner URL private.


VERSION 3 SEARCHABLE ROOKIE DATABASE
- 79 drafted 2026 QBs, RBs, WRs, and TEs are preloaded.
- Start typing a player name on the commissioner page.
- Select the suggestion and tap Draft Selected Player.
- Drafted players disappear from search results automatically.
- Manual Write-In remains available.
- The TV board also displays the player's real NFL draft number.

DEPLOYING THIS UPGRADE
1. Keep your existing Netlify site.
2. Open Netlify > Deploys.
3. Drag this entire extracted V3 folder into the manual deploy area.
4. Wait for Published.
5. Hard-refresh both TV and commissioner pages.
6. Your existing Firebase draft data remains in place unless you reset it.


VERSION 3.1 — TV FULL-SCREEN BUTTON
- The TV page now has a gold FULL SCREEN button in the lower-right corner.
- Click it once to enter browser full-screen mode.
- Click it again or press Escape to leave full-screen mode.
- If a TV browser blocks the button, use F11 on the connected Windows laptop.

DEPLOY THIS UPDATE
1. Extract this folder.
2. Open the existing Netlify site.
3. Go to Deploys.
4. Drag the entire extracted V3.1 folder into the manual deploy area.
5. Hard-refresh tv.html after Netlify publishes the update.


VERSION 4 — MOBILE + DRAFT COUNTDOWN
- Mobile-first navigation on every page.
- Home page redesigned for phones.
- Commissioner controls enlarged for one-handed use.
- Draft board scrolls cleanly on phones and tablets.
- Hall of Champions preserved and improved for mobile.
- New countdown.html page counts down to:
  Saturday, August 1, 2026 at 8:30 PM Central Time.
- Countdown page includes full-screen presentation mode.

DEPLOYMENT
1. Extract this ZIP.
2. Open your existing Netlify site.
3. Go to Deploys.
4. Drag the entire extracted V4 folder into the manual deploy area.
5. Wait for Published.
6. Hard-refresh each page.
7. Your Firebase configuration and current draft room are included and unchanged.


VERSION 4.2 — PICK STATUS / SUSPENSE MODE
- Commissioner page now has:
  THE PICK IS IN
  BACK ON THE CLOCK
- Pressing THE PICK IS IN pauses the one-minute clock and sends a full-screen suspense slate to the TV.
- The suspense slate remains visible while the commissioner searches and submits the player.
- When the selection is submitted, the suspense slate transitions into the player reveal animation.
- The draft then advances to the next pick and returns to ON THE CLOCK automatically.
- Selecting another pick or resetting the timer also returns status to ON THE CLOCK.

DEPLOYMENT
1. Extract this ZIP.
2. Open the existing Netlify site.
3. Go to Deploys.
4. Drag the entire extracted V4.2 folder into the manual deploy area.
5. Wait for Published.
6. Hard-refresh admin.html and tv.html.
7. Test:
   a. Start the clock.
   b. Tap THE PICK IS IN on admin.
   c. Confirm the TV displays the suspense slate.
   d. Submit a player.
   e. Confirm the player reveal animation appears.


VERSION 4.3 — GOODELL MODE
WORKFLOW
1. Select a rookie on the commissioner page.
2. Optionally press THE PICK IS IN first for the suspense slate.
3. Press START GOODELL REVEAL.
4. The TV runs a three-stage formal announcement:
   - “With the ___ pick...”
   - Owner name and “selects...”
   - Player, position, NFL team, and NFL draft number
5. Press FINALIZE PICK on the commissioner page after the reveal.
6. The pick is added to the board and ticker, and the next owner goes on the clock.

TV AUDIO
- Click ENABLE ANNOUNCER once on the TV page.
- This browser permission step enables text-to-speech.
- The preference is saved in that browser.
- Goodell Mode still works visually when audio is disabled.

STANDARD QUICK PICKS
- “Draft Selected Player” remains available and immediately records a pick without Goodell Mode.

DEPLOYMENT
Upload every file from this folder to the root of the GitHub repository, replacing existing files.
GitHub Pages will republish automatically.
Hard-refresh admin.html and tv.html after the deployment finishes.
