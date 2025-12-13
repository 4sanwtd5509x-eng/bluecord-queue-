# 📝 Message Queue for Aliucord

A smart message queue extension for Aliucord that helps you avoid Discord's rate limits by queuing messages and sending them automatically.

## ✨ Features

- **Queue Messages**: Automatically queue messages instead of sending immediately
- **Rate Limit Protection**: Configurable delay between messages (500ms to 10s)
- **Floating Button**: Quick access to queue management
- **Queue Modal**: View, pause, resume, and clear your queue
- **Auto-send**: Messages send automatically when ready
- **Retry Logic**: Failed messages retry up to 3 times
- **Persistent Storage**: Queue survives app restarts
- **Settings Panel**: Configure all options in Aliucord settings

## 📱 Installation

### Method 1: Using Aliucord Plugin Manager
1. Open **Aliucord**
2. Go to **Settings** → **Plugins**
3. Tap the **+** button
4. Search for "Message Queue" or enter the download URL
5. Tap **Install**
6. Enable the plugin
7. Restart Discord

### Method 2: Manual Installation
1. Download the plugin ZIP from releases
2. Place it in: `/storage/emulated/0/Aliucord/plugins/`
3. Restart Aliucord
4. Enable in Settings → Plugins

### Method 3: From GitHub
1. In Aliucord, go to Settings → Plugins
2. Tap **"Add Plugin"**
3. Enter: `https://github.com/YOUR_USERNAME/aliucord-message-queue`
4. Tap **Install**

## 🚀 Usage

### Basic Usage
1. **Enable the plugin** in Aliucord settings
2. **Type a message** in any Discord channel
3. The message will be **added to queue** automatically
4. Messages **auto-send** with your configured delay
5. Tap the **⏱️ floating button** to manage queue

### Queue Management
- **Pause/Resume**: Stop/start auto-sending
- **Clear Queue**: Remove all queued messages
- **View Queue**: See all pending messages with status
- **Settings**: Configure delay, auto-send, and more

### Accessing Queue
1. **Floating Button**: Tap ⏱️ in bottom-right corner
2. **Plugin Settings**: Go to Aliucord Settings → Plugins → Message Queue

## ⚙️ Configuration

### Plugin Settings
- **Enabled**: Toggle queue functionality
- **Delay**: 500ms to 10 seconds between messages
- **Max Queue Size**: 5 to 200 messages
- **Auto-send**: Toggle automatic sending
- **Show Floating Button**: Show/hide the queue button
- **Show Notifications**: Toast notifications

### Queue Modal
Access from floating button:
1. **Queue Status**: See pending/sending/failed messages
2. **Controls**: Pause/resume, clear queue
3. **Quick Settings**: Toggle main features

## 📊 Queue Status

- **🟡 PENDING**: Waiting to be sent
- **🔵 SENDING**: Currently being sent
- **🔴 FAILED**: Failed to send (retries automatically)

## ⚠️ Important Notes

### Rate Limiting
- Discord rate limits: ~5 messages per 5 seconds
- Default 2-second delay is safe
- Adjust based on your needs

### Warnings
- ⚠️ **Use responsibly** - Don't spam
- ⚠️ **Respect Discord's ToS**
- ⚠️ **Queue is local** to your device
- ⚠️ **Test on alt account** first

### Best Practices
1. Start with 2-second delay
2. Keep queue under 20 messages
3. Clear queue before logging out
4. Pause queue in busy channels

## 🔧 Troubleshooting

### Plugin not loading?
- Check Aliucord version (requires 126.21+)
- Restart Aliucord and Discord
- Reinstall the plugin

### Messages not sending?
- Check internet connection
- Increase delay setting
- Clear queue
- Check Discord status

### Floating button not showing?
- Enable "Show Floating Button" in settings
- Restart Discord
- Check for theme conflicts

## 📝 Changelog

### v1.0.0
- Initial release
- Message queue functionality
- Floating button UI
- Queue management modal
- Settings panel
- Persistent storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file

## 🔗 Links

- **GitHub**: https://github.com/YOUR_USERNAME/aliucord-message-queue
- **Aliucord**: https://github.com/Aliucord/Aliucord
- **Discord Support**: YourServerLink

## 🆘 Support

1. Open a GitHub Issue
2. Join our Discord server
3. Check existing issues

---

**Made for the Aliucord community ❤️**
