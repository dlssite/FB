# 🎙️ TempVoice

TempVoice provides fully dynamic, on-demand temporary voice channels with advanced host controls.

## 🔊 Channel Management

### `/tempvoice`
Spawns the interactive **TempVoice Master Panel** in the current channel.
- **Permission**: `ManageChannels` (to set up the generator panel)
- **Mechanic**: Users click the generator button to spawn their own private or public voice lounge. The channel is automatically deleted when the last participant disconnects.

## 🎛️ Host Controls (via UI Panel)

When a user spawns a TempVoice channel, they receive a dedicated control interface allowing them to:
- **Lock / Unlock**: Instantly restrict or open access to the channel.
- **Hide / Unhide**: Conceal the channel from the public channel list.
- **Rename**: Customize the lounge's name.
- **Bitrate & Limit**: Adjust audio quality and set member capacity caps.
- **Kick / Ban / Transfer**: Manage participants and transfer host ownership to another member.
