# 🎶 Symphony Music Engine

The Symphony Music Engine delivers high-fidelity audio streaming, modular satellite features, audio filters, trivia minigames, and listener rewards.

## 🎧 Playback & Queue Commands

All music commands are subcommands of **`/music`**.
💡 **Prefix Support**: You can also use `$play`, `$skip`, `$queue`, `$np`, etc. (using your server's prefix).

### `/music play <query>`
Searches and queues a track or playlist from YouTube, Spotify, SoundCloud, or Apple Music.
- **Prefix**: `$play <query>`

### `/music queue`
Displays the active playback queue, current track progress, and upcoming songs.
- **Prefix**: `$queue` or `$q`

### `/music skip`
Votes to skip the current track. Instantly skips if executed by the DJ or if the required vote threshold is met.
- **Prefix**: `$skip`

### `/music lyrics`
Pulls real-time synchronized lyrics for the currently playing song via Genius.
- **Prefix**: `$lyrics`

### `/music effects <filter>`
Toggles studio-grade audio filters (Bassboost, Nightcore, Vaporwave, Echo, 8D).
- **Prefix**: `$filter <name>`

## 💾 Playlists & Live DJ

### `/music playlist_save <name>`, `/music playlist_load <name>`, `/music playlist_list`
Create, load, and manage your personal custom playlists across any server.

### `/music livedj`
Spawns the interactive **Live DJ Control Deck** with permanent button controls for seamless queue management.
- **Prefix**: `$dj`

## 🎮 Minigames & Economy

### `/music trivia`
Launches the **Music Trivia** minigame — guess the song title or artist from a short audio clip to earn Embers and XP.
- **Prefix**: `$musictrivia`

### `/music challenges` & `/music leaderboard`
View active listening challenges (e.g., "Listen to 50 tracks") and top listener leaderboards.

### `/music use <item>`
Spends Symphony Suite catalysts (e.g., Instant Skips, Priority Tickets) from your inventory.

## 🛠️ Administrative Commands

### `/music setup`, `/music nodes`, `/music schedule`, `/music stats`
Configures 24/7 voice channels, manages Lavalink audio nodes, schedules automated concerts, and views engine telemetry.
- **Permission**: `ManageGuild`
