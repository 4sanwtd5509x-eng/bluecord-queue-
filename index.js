/*
 * Message Queue Extension for Aliucord
 * Queue messages to avoid Discord rate limits
 */

const { 
    Plugin, 
    Utils,
    Patcher,
    Toasts,
    Styles,
    DiscordModules: { MessageActions, ChannelStore },
    ReactNative: { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, StyleSheet }
} = require("aliucord");

const { getByProps } = require("aliucord/metro");
const { createThemedStyleSheet } = Styles;
const { showToast } = Toasts;
const { Messages } = require("aliucord/api");

// Create styles
const styles = createThemedStyleSheet({
    container: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center"
    },
    modal: {
        backgroundColor: "#2f3136",
        borderRadius: 12,
        width: "90%",
        maxWidth: 400,
        maxHeight: "80%",
        padding: 0,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12
    },
    header: {
        backgroundColor: "#202225",
        padding: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    title: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "bold"
    },
    badge: {
        backgroundColor: "#5865f2",
        color: "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 14
    },
    content: {
        padding: 16
    },
    controls: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16
    },
    button: {
        flex: 1,
        backgroundColor: "#5865f2",
        padding: 12,
        borderRadius: 8,
        alignItems: "center"
    },
    buttonText: {
        color: "#ffffff",
        fontWeight: "600"
    },
    pauseButton: {
        backgroundColor: "#ed4245"
    },
    resumeButton: {
        backgroundColor: "#3ba55d"
    },
    clearButton: {
        backgroundColor: "#ed4245"
    },
    queueList: {
        maxHeight: 300,
        marginBottom: 16
    },
    queueItem: {
        backgroundColor: "#36393f",
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#faa81a"
    },
    queueItemSending: {
        borderLeftColor: "#5865f2"
    },
    queueItemFailed: {
        borderLeftColor: "#ed4245"
    },
    queueHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8
    },
    status: {
        color: "#faa81a",
        fontSize: 12,
        fontWeight: "bold",
        textTransform: "uppercase"
    },
    timestamp: {
        color: "#72767d",
        fontSize: 12
    },
    messageText: {
        color: "#ffffff",
        fontSize: 14,
        lineHeight: 18
    },
    emptyQueue: {
        alignItems: "center",
        padding: 40,
        justifyContent: "center"
    },
    emptyText: {
        color: "#72767d",
        fontSize: 16,
        textAlign: "center",
        marginTop: 8
    },
    settings: {
        backgroundColor: "#202225",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16
    },
    settingsTitle: {
        color: "#b9bbbe",
        fontSize: 14,
        marginBottom: 8
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8
    },
    settingLabel: {
        color: "#ffffff",
        fontSize: 14,
        marginLeft: 8,
        flex: 1
    },
    slider: {
        width: "100%",
        height: 40
    },
    closeButton: {
        backgroundColor: "#202225",
        padding: 12,
        borderRadius: 8,
        alignItems: "center"
    },
    floatingButton: {
        position: "absolute",
        bottom: 80,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#5865f2",
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 9999
    },
    badgeCount: {
        position: "absolute",
        top: -5,
        right: -5,
        backgroundColor: "#ed4245",
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
    badgeText: {
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "bold"
    }
});

module.exports = class MessageQueue extends Plugin {
    constructor() {
        super();
        
        // Default settings
        this.defaultSettings = {
            enabled: true,
            delay: 2000,
            maxQueueSize: 50,
            autoSend: true,
            showNotifications: true,
            showFloatingButton: true,
            queueOnEnter: false,
            buttonPosition: "bottom-right"
        };
        
        // Initialize
        this.queue = [];
        this.isProcessing = false;
        this.isPaused = false;
        this.isModalVisible = false;
        this.floatingButton = null;
    }
    
    async start() {
        console.log("[Message Queue] Starting...");
        
        // Load saved settings
        this.settings = { ...this.defaultSettings, ...this.settings };
        
        // Load saved queue
        this.loadQueue();
        
        // Patch message sending
        this.patchMessageSending();
        
        // Create floating button
        this.createFloatingButton();
        
        // Start queue processor
        this.startQueueProcessor();
        
        console.log("[Message Queue] Started successfully");
        
        // Show welcome toast
        this.showToast("Message Queue enabled! Tap ⏱️ to manage queue", Toasts.Type.INFO);
    }
    
    stop() {
        console.log("[Message Queue] Stopping...");
        
        // Remove patches
        Patcher.unpatchAll("MessageQueue");
        
        // Remove floating button
        this.removeFloatingButton();
        
        // Save queue and settings
        this.saveQueue();
        
        // Clear intervals
        clearInterval(this.processorInterval);
        
        console.log("[Message Queue] Stopped");
    }
    
    loadQueue() {
        try {
            const saved = this.settingsStorage.getString("messageQueue", "[]");
            this.queue = JSON.parse(saved);
        } catch (e) {
            console.error("[Message Queue] Failed to load queue:", e);
            this.queue = [];
        }
    }
    
    saveQueue() {
        try {
            this.settingsStorage.setString("messageQueue", JSON.stringify(this.queue));
        } catch (e) {
            console.error("[Message Queue] Failed to save queue:", e);
        }
    }
    
    patchMessageSending() {
        // Patch the message send function
        const MessageActions = getByProps("sendMessage", "editMessage", "deleteMessage");
        
        if (MessageActions && MessageActions.sendMessage) {
            Patcher.before("MessageQueue", MessageActions, "sendMessage", (_, args) => {
                const [channelId, message] = args;
                
                // Check if we should queue
                if (this.shouldQueueMessage()) {
                    this.addToQueue(channelId, message);
                    
                    // Prevent original send
                    args[1] = { ...message, content: "" };
                    
                    return;
                }
            });
            
            console.log("[Message Queue] Message sending patched");
        } else {
            console.error("[Message Queue] Could not find sendMessage function");
        }
    }
    
    shouldQueueMessage() {
        return this.settings.enabled && !this.settings.queueOnEnter;
    }
    
    addToQueue(channelId, message) {
        if (this.queue.length >= this.settings.maxQueueSize) {
            this.showToast(`Queue full! Max ${this.settings.maxQueueSize} messages`, Toasts.Type.FAILURE);
            return false;
        }
        
        const queueItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            channelId,
            content: message.content || "",
            timestamp: Date.now(),
            status: "pending",
            attempts: 0
        };
        
        this.queue.push(queueItem);
        this.saveQueue();
        this.updateFloatingButton();
        
        if (this.settings.showNotifications) {
            this.showToast(`Queued! (${this.queue.length} total)`, Toasts.Type.SUCCESS);
        }
        
        return true;
    }
    
    async sendQueuedMessage(item) {
        try {
            item.status = "sending";
            
            // Send using Discord's API
            await Messages.send(item.channelId, {
                content: item.content,
                tts: false,
                invalidEmojis: [],
                validNonShortcutEmojis: []
            });
            
            // Remove from queue on success
            this.queue = this.queue.filter(q => q.id !== item.id);
            this.saveQueue();
            this.updateFloatingButton();
            
            return true;
        } catch (error) {
            console.error("[Message Queue] Send failed:", error);
            item.status = "failed";
            item.lastError = error.message;
            item.attempts++;
            
            // Remove after 3 failed attempts
            if (item.attempts >= 3) {
                this.queue = this.queue.filter(q => q.id !== item.id);
                this.showToast("Failed to send message after 3 attempts", Toasts.Type.FAILURE);
            }
            
            this.saveQueue();
            this.updateFloatingButton();
            return false;
        }
    }
    
    startQueueProcessor() {
        this.processorInterval = setInterval(async () => {
            if (this.isPaused || !this.settings.autoSend || this.queue.length === 0) {
                return;
            }
            
            // Find next pending message
            const nextItem = this.queue.find(item => item.status === "pending");
            if (!nextItem) return;
            
            // Process with delay
            this.isProcessing = true;
            await Utils.sleep(this.settings.delay);
            
            await this.sendQueuedMessage(nextItem);
            
            this.isProcessing = false;
        }, 1000);
    }
    
    showToast(message, type = Toasts.Type.INFO) {
        showToast(message, type);
    }
    
    createFloatingButton() {
        if (!this.settings.showFloatingButton) return;
        
        // Get the main view
        const { View, TouchableOpacity, Text } = require("react-native");
        const { getByDisplayName } = require("aliucord/metro");
        const Chat = getByDisplayName("Chat", { all: true })[0];
        
        if (!Chat) return;
        
        // Create floating button
        this.floatingButton = (
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => this.toggleModal()}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 24, color: "#ffffff" }}>⏱️</Text>
                {this.queue.length > 0 && (
                    <View style={styles.badgeCount}>
                        <Text style={styles.badgeText}>
                            {this.queue.length > 99 ? "99+" : this.queue.length}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
        
        // Find where to inject the button
        Patcher.after("MessageQueue", Chat.prototype, "render", (_, __, ret) => {
            try {
                // Add floating button to the chat view
                const children = ret.props.children;
                if (Array.isArray(children)) {
                    children.push(this.floatingButton);
                } else if (children) {
                    ret.props.children = [children, this.floatingButton];
                }
            } catch (e) {
                console.error("[Message Queue] Failed to inject button:", e);
            }
            
            return ret;
        });
    }
    
    removeFloatingButton() {
        if (this.floatingButton) {
            // Remove from DOM if possible
            const Chat = getByDisplayName("Chat", { all: true })[0];
            if (Chat) {
                Patcher.unpatchAll("MessageQueue");
            }
        }
    }
    
    updateFloatingButton() {
        // Force re-render of chat to update badge
        this.removeFloatingButton();
        this.createFloatingButton();
    }
    
    toggleModal() {
        this.isModalVisible = !this.isModalVisible;
        this.forceUpdate();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.showToast(
            this.isPaused ? "Queue paused" : "Queue resumed",
            this.isPaused ? Toasts.Type.INFO : Toasts.Type.SUCCESS
        );
        this.forceUpdate();
    }
    
    clearQueue() {
        if (this.queue.length === 0) return;
        
        // Show confirmation dialog
        const { Alert } = require("react-native");
        Alert.alert(
            "Clear Queue",
            `Clear all ${this.queue.length} messages from queue?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear", 
                    style: "destructive",
                    onPress: () => {
                        this.queue = [];
                        this.saveQueue();
                        this.updateFloatingButton();
                        this.showToast("Queue cleared", Toasts.Type.SUCCESS);
                        this.forceUpdate();
                    }
                }
            ]
        );
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        if (key === "showFloatingButton") {
            if (value) {
                this.createFloatingButton();
            } else {
                this.removeFloatingButton();
            }
        }
        
        this.forceUpdate();
    }
    
    saveSettings() {
        this.settingsStorage.setObject("settings", this.settings);
    }
    
    forceUpdate() {
        // Trigger a re-render
        this.emit("update");
    }
    
    getSettingsPanel() {
        const { View, Text, Switch, Slider, TouchableOpacity } = require("react-native");
        
        return () => (
            <ScrollView style={{ flex: 1, backgroundColor: "#36393f" }}>
                <View style={{ padding: 16 }}>
                    <Text style={{ 
                        color: "#ffffff", 
                        fontSize: 20, 
                        fontWeight: "bold",
                        marginBottom: 16 
                    }}>
                        Message Queue Settings
                    </Text>
                    
                    <View style={{ 
                        backgroundColor: "#2f3136", 
                        borderRadius: 8, 
                        padding: 16,
                        marginBottom: 16 
                    }}>
                        <Text style={{ color: "#b9bbbe", marginBottom: 8 }}>
                            Current Queue Size: {this.queue.length} messages
                        </Text>
                        <Text style={{ color: "#b9bbbe", fontSize: 12 }}>
                            Status: {this.isPaused ? "⏸️ Paused" : "▶️ Active"}
                        </Text>
                    </View>
                    
                    {/* Enabled Toggle */}
                    <View style={styles.settingItem}>
                        <Switch
                            value={this.settings.enabled}
                            onValueChange={(value) => this.updateSetting("enabled", value)}
                        />
                        <Text style={styles.settingLabel}>Enable Message Queue</Text>
                    </View>
                    
                    {/* Auto-send Toggle */}
                    <View style={styles.settingItem}>
                        <Switch
                            value={this.settings.autoSend}
                            onValueChange={(value) => this.updateSetting("autoSend", value)}
                        />
                        <Text style={styles.settingLabel}>Auto-send messages</Text>
                    </View>
                    
                    {/* Show Floating Button */}
                    <View style={styles.settingItem}>
                        <Switch
                            value={this.settings.showFloatingButton}
                            onValueChange={(value) => this.updateSetting("showFloatingButton", value)}
                        />
                        <Text style={styles.settingLabel}>Show floating button</Text>
                    </View>
                    
                    {/* Delay Slider */}
                    <View style={{ marginVertical: 16 }}>
                        <Text style={{ color: "#ffffff", marginBottom: 8 }}>
                            Delay between messages: {this.settings.delay}ms
                        </Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={500}
                            maximumValue={10000}
                            step={500}
                            value={this.settings.delay}
                            onSlidingComplete={(value) => this.updateSetting("delay", value)}
                            minimumTrackTintColor="#5865f2"
                            maximumTrackTintColor="#202225"
                            thumbTintColor="#5865f2"
                        />
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: "#b9bbbe", fontSize: 12 }}>500ms</Text>
                            <Text style={{ color: "#b9bbbe", fontSize: 12 }}>10s</Text>
                        </View>
                    </View>
                    
                    {/* Max Queue Size */}
                    <View style={{ marginVertical: 16 }}>
                        <Text style={{ color: "#ffffff", marginBottom: 8 }}>
                            Max queue size: {this.settings.maxQueueSize}
                        </Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={5}
                            maximumValue={200}
                            step={5}
                            value={this.settings.maxQueueSize}
                            onSlidingComplete={(value) => this.updateSetting("maxQueueSize", value)}
                            minimumTrackTintColor="#5865f2"
                            maximumTrackTintColor="#202225"
                            thumbTintColor="#5865f2"
                        />
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: "#b9bbbe", fontSize: 12 }}>5</Text>
                            <Text style={{ color: "#b9bbbe", fontSize: 12 }}>200</Text>
                        </View>
                    </View>
                    
                    {/* Queue Actions */}
                    <TouchableOpacity
                        style={[styles.button, { marginBottom: 8 }]}
                        onPress={() => this.togglePause()}
                    >
                        <Text style={styles.buttonText}>
                            {this.isPaused ? "▶️ Resume Queue" : "⏸️ Pause Queue"}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.button, styles.clearButton]}
                        onPress={() => this.clearQueue()}
                    >
                        <Text style={styles.buttonText}>🗑️ Clear Queue</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }
    
    // Modal component for queue management
    QueueModal = () => {
        const { Modal, View, Text, TouchableOpacity, ScrollView, Switch } = require("react-native");
        
        if (!this.isModalVisible) return null;
        
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={this.isModalVisible}
                onRequestClose={() => this.toggleModal()}
            >
                <View style={styles.container}>
                    <View style={styles.modal}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>📝 Message Queue</Text>
                            <View style={styles.badge}>
                                <Text style={{ color: "#ffffff" }}>
                                    {this.queue.length}/{this.settings.maxQueueSize}
                                </Text>
                            </View>
                        </View>
                        
                        {/* Content */}
                        <ScrollView style={styles.content}>
                            {/* Controls */}
                            <View style={styles.controls}>
                                <TouchableOpacity
                                    style={[styles.button, this.isPaused ? styles.resumeButton : styles.pauseButton]}
                                    onPress={() => this.togglePause()}
                                >
                                    <Text style={styles.buttonText}>
                                        {this.isPaused ? "▶️ Resume" : "⏸️ Pause"}
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.button, styles.clearButton]}
                                    onPress={() => this.clearQueue()}
                                >
                                    <Text style={styles.buttonText}>🗑️ Clear</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Queue List */}
                            <View style={styles.queueList}>
                                {this.queue.length === 0 ? (
                                    <View style={styles.emptyQueue}>
                                        <Text style={{ fontSize: 32, color: "#72767d" }}>📭</Text>
                                        <Text style={styles.emptyText}>
                                            Queue is empty{"\n"}
                                            <Text style={{ fontSize: 12 }}>
                                                Send a message to add it to queue
                                            </Text>
                                        </Text>
                                    </View>
                                ) : (
                                    this.queue.map(item => (
                                        <View 
                                            key={item.id} 
                                            style={[
                                                styles.queueItem,
                                                item.status === "sending" && styles.queueItemSending,
                                                item.status === "failed" && styles.queueItemFailed
                                            ]}
                                        >
                                            <View style={styles.queueHeader}>
                                                <Text style={[
                                                    styles.status,
                                                    { 
                                                        color: item.status === "pending" ? "#faa81a" :
                                                               item.status === "sending" ? "#5865f2" : "#ed4245"
                                                    }
                                                ]}>
                                                    {item.status.toUpperCase()}
                                                </Text>
                                                <Text style={styles.timestamp}>
                                                    {new Date(item.timestamp).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </Text>
                                            </View>
                                            <Text style={styles.messageText} numberOfLines={3}>
                                                {item.content || "No content"}
                                            </Text>
                                            {item.attempts > 0 && (
                                                <Text style={{ 
                                                    color: "#ed4245", 
                                                    fontSize: 11, 
                                                    marginTop: 4 
                                                }}>
                                                    Attempt {item.attempts}/3
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                )}
                            </View>
                            
                            {/* Settings */}
                            <View style={styles.settings}>
                                <Text style={styles.settingsTitle}>Settings</Text>
                                
                                <View style={styles.settingItem}>
                                    <Switch
                                        value={this.settings.enabled}
                                        onValueChange={(value) => this.updateSetting("enabled", value)}
                                    />
                                    <Text style={styles.settingLabel}>Enable Queue</Text>
                                </View>
                                
                                <View style={styles.settingItem}>
                                    <Switch
                                        value={this.settings.autoSend}
                                        onValueChange={(value) => this.updateSetting("autoSend", value)}
                                    />
                                    <Text style={styles.settingLabel}>Auto-send</Text>
                                </View>
                            </View>
                            
                            {/* Close Button */}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => this.toggleModal()}
                            >
                                <Text style={[styles.buttonText, { color: "#ffffff" }]}>Close</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    }
};
