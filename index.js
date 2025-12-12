/**
 * Message Queue Extension for Bluecord
 * GitHub: https://github.com/yourusername/bluecord-message-queue
 */

const { React, Flux, getModule, i18n, constants, modal, toast, ReactDOM } = require('bluecord/moduleAPI');
const { inject, uninject } = require('bluecord/webpack');
const { persist } = require('bluecord/data');

// Settings store
const defaultSettings = {
  enabled: true,
  delay: 2000,
  maxQueueSize: 50,
  autoSend: true,
  showNotifications: true,
  queueOnEnter: false
};

// Create Message Queue class
class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.isPaused = false;
    this.settings = persist.retrieve('messageQueueSettings') || defaultSettings;
    
    // Initialize
    this.initialize();
  }
  
  initialize() {
    console.log('[Message Queue] Initializing...');
    
    // Patch message sending
    this.patchMessageSend();
    
    // Create UI components
    this.createUIComponents();
    
    // Start queue processor
    this.startProcessor();
    
    // Save settings on unload
    window.addEventListener('beforeunload', () => {
      persist.store('messageQueueSettings', this.settings);
    });
    
    console.log('[Message Queue] Initialized successfully');
  }
  
  patchMessageSend() {
    const messageModule = getModule(m => m.sendMessage || m.submitMessage);
    if (!messageModule) {
      console.error('[Message Queue] Could not find message module');
      return;
    }
    
    // Store original function
    const originalSend = messageModule.sendMessage || messageModule.submitMessage;
    
    // Patch it
    this.sendMessage = async (channelId, message) => {
      // Check if we should queue
      if (this.shouldQueueMessage()) {
        this.addToQueue(channelId, message);
        
        // Show toast notification
        if (this.settings.showNotifications) {
          toast.toast(`Message queued! (${this.queue.length} in queue)`, {
            type: 'success',
            timeout: 3000
          });
        }
        
        return Promise.resolve();
      }
      
      // Send immediately
      return originalSend.call(this, channelId, message);
    };
    
    // Replace the original function
    if (messageModule.sendMessage) {
      messageModule.sendMessage = this.sendMessage.bind(this);
    }
    if (messageModule.submitMessage) {
      messageModule.submitMessage = this.sendMessage.bind(this);
    }
  }
  
  shouldQueueMessage() {
    // Queue if enabled and not holding shift/ctrl
    return this.settings.enabled && !this.settings.queueOnEnter;
  }
  
  addToQueue(channelId, message) {
    if (this.queue.length >= this.settings.maxQueueSize) {
      toast.toast('Queue is full! Maximum ' + this.settings.maxQueueSize + ' messages allowed.', {
        type: 'error',
        timeout: 4000
      });
      return false;
    }
    
    const queueItem = {
      id: Date.now() + Math.random(),
      channelId,
      message,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };
    
    this.queue.push(queueItem);
    this.updateUI();
    return true;
  }
  
  async processQueue() {
    if (this.isProcessing || this.isPaused || !this.settings.autoSend || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const item = this.queue[0];
    
    try {
      item.status = 'sending';
      item.attempts++;
      this.updateUI();
      
      // Get current send function
      const messageModule = getModule(m => m.sendMessage || m.submitMessage);
      const originalSend = messageModule.sendMessage || messageModule.submitMessage;
      
      // Send the message
      await originalSend.call(this, item.channelId, item.message);
      
      // Remove from queue
      this.queue.shift();
      this.updateUI();
      
      if (this.settings.showNotifications) {
        toast.toast('Message sent!', {
          type: 'info',
          timeout: 2000
        });
      }
      
    } catch (error) {
      console.error('[Message Queue] Failed to send:', error);
      item.status = 'failed';
      item.error = error.message;
      this.updateUI();
      
      // Retry after delay if less than 3 attempts
      if (item.attempts < 3) {
        setTimeout(() => {
          item.status = 'pending';
          this.updateUI();
        }, 5000);
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  startProcessor() {
    setInterval(() => this.processQueue(), 1000);
    
    // Also process when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.processQueue();
      }
    });
  }
  
  createUIComponents() {
    // Create React component for queue button
    const MessageQueueButton = () => {
      const [isOpen, setIsOpen] = React.useState(false);
      
      const toggleQueue = () => {
        this.isPaused = !this.isPaused;
        toast.toast(this.isPaused ? 'Queue paused' : 'Queue resumed', {
          type: 'info'
        });
      };
      
      const clearQueue = () => {
        this.queue = [];
        this.updateUI();
        toast.toast('Queue cleared', { type: 'info' });
      };
      
      return React.createElement('div', {
        style: {
          position: 'fixed',
          bottom: 70,
          right: 10,
          zIndex: 1000
        }
      }, [
        // Main queue button
        React.createElement('button', {
          key: 'main',
          onClick: () => setIsOpen(!isOpen),
          style: {
            backgroundColor: this.queue.length > 0 ? '#5865F2' : '#4F545C',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 50,
            height: 50,
            fontSize: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }
        }, '⏱️'),
        
        // Queue count badge
        this.queue.length > 0 && React.createElement('div', {
          key: 'badge',
          style: {
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: '#ED4245',
            color: 'white',
            borderRadius: '50%',
            width: 20,
            height: 20,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }, this.queue.length),
        
        // Queue panel when open
        isOpen && React.createElement('div', {
          key: 'panel',
          style: {
            position: 'absolute',
            bottom: 60,
            right: 0,
            width: 250,
            backgroundColor: '#2F3136',
            borderRadius: 8,
            padding: 15,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid #202225'
          }
        }, [
          React.createElement('h3', {
            key: 'title',
            style: {
              margin: '0 0 10px 0',
              color: 'white'
            }
          }, 'Message Queue'),
          
          React.createElement('div', {
            key: 'stats',
            style: {
              color: '#B9BBBE',
              fontSize: 12,
              marginBottom: 10
            }
          }, `${this.queue.length} messages in queue`),
          
          // Queue controls
          React.createElement('div', {
            key: 'controls',
            style: {
              display: 'flex',
              gap: 5,
              marginBottom: 10
            }
          }, [
            React.createElement('button', {
              key: 'pause',
              onClick: toggleQueue,
              style: {
                flex: 1,
                backgroundColor: this.isPaused ? '#3BA55D' : '#5865F2',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                padding: '5px 0',
                cursor: 'pointer'
              }
            }, this.isPaused ? '▶️ Resume' : '⏸️ Pause'),
            
            React.createElement('button', {
              key: 'clear',
              onClick: clearQueue,
              style: {
                flex: 1,
                backgroundColor: '#ED4245',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                padding: '5px 0',
                cursor: 'pointer'
              }
            }, '🗑️ Clear')
          ]),
          
          // Queue list
          React.createElement('div', {
            key: 'list',
            style: {
              maxHeight: 200,
              overflowY: 'auto'
            }
          }, this.queue.length === 0 ? 
            React.createElement('div', {
              style: {
                padding: 10,
                textAlign: 'center',
                color: '#72767D',
                fontSize: 12
              }
            }, 'Queue is empty') :
            this.queue.slice(0, 10).map((item, index) => 
              React.createElement('div', {
                key: item.id,
                style: {
                  padding: '5px 0',
                  borderBottom: '1px solid #202225',
                  fontSize: 12
                }
              }, [
                React.createElement('div', {
                  key: 'content',
                  style: {
                    color: 'white',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }, item.message.content || 'No content'),
                React.createElement('div', {
                  key: 'status',
                  style: {
                    color: item.status === 'pending' ? '#FAA81A' : 
                           item.status === 'sending' ? '#5865F2' : '#ED4245',
                    fontSize: 10
                  }
                }, item.status.toUpperCase())
              ])
            )
          )
        ])
      ]);
    };
    
    // Inject the button into Discord's UI
    this.injectInterval = setInterval(() => {
      const chatContainer = document.querySelector('[class*="chat"]');
      if (chatContainer && !document.getElementById('message-queue-root')) {
        const root = document.createElement('div');
        root.id = 'message-queue-root';
        chatContainer.appendChild(root);
        ReactDOM.render(React.createElement(MessageQueueButton), root);
      }
    }, 1000);
  }
  
  updateUI() {
    // Trigger a re-render if needed
    const event = new CustomEvent('messageQueueUpdate');
    window.dispatchEvent(event);
  }
  
  // Settings panel component
  createSettingsPanel() {
    const SettingsPanel = () => {
      return React.createElement('div', {
        style: {
          padding: 20,
          color: 'white'
        }
      }, [
        React.createElement('h2', { key: 'title' }, 'Message Queue Settings'),
        
        // Enable/disable toggle
        React.createElement('div', {
          key: 'enabled',
          style: { marginBottom: 15 }
        }, [
          React.createElement('label', {
            key: 'label',
            style: { display: 'block', marginBottom: 5 }
          }, 'Enable Message Queue'),
          React.createElement('input', {
            key: 'input',
            type: 'checkbox',
            checked: this.settings.enabled,
            onChange: (e) => {
              this.settings.enabled = e.target.checked;
              this.updateUI();
            }
          })
        ]),
        
        // Delay between messages
        React.createElement('div', {
          key: 'delay',
          style: { marginBottom: 15 }
        }, [
          React.createElement('label', {
            key: 'label',
            style: { display: 'block', marginBottom: 5 }
          }, `Delay between messages: ${this.settings.delay}ms`),
          React.createElement('input', {
            key: 'input',
            type: 'range',
            min: 500,
            max: 10000,
            step: 500,
            value: this.settings.delay,
            onChange: (e) => {
              this.settings.delay = parseInt(e.target.value);
              this.updateUI();
            },
            style: { width: '100%' }
          })
        ]),
        
        // Max queue size
        React.createElement('div', {
          key: 'maxSize',
          style: { marginBottom: 15 }
        }, [
          React.createElement('label', {
            key: 'label',
            style: { display: 'block', marginBottom: 5 }
          }, `Max queue size: ${this.settings.maxQueueSize}`),
          React.createElement('input', {
            key: 'input',
            type: 'range',
            min: 5,
            max: 200,
            step: 5,
            value: this.settings.maxQueueSize,
            onChange: (e) => {
              this.settings.maxQueueSize = parseInt(e.target.value);
              this.updateUI();
            },
            style: { width: '100%' }
          })
        ])
      ]);
    };
    
    return SettingsPanel;
  }
  
  // Cleanup
  destroy() {
    clearInterval(this.injectInterval);
    
    // Remove React root
    const root = document.getElementById('message-queue-root');
    if (root) {
      ReactDOM.unmountComponentAtNode(root);
      root.remove();
    }
    
    // Restore original send function
    persist.store('messageQueueSettings', this.settings);
    
    console.log('[Message Queue] Extension destroyed');
  }
}

// Export for Bluecord
module.exports = class MessageQueueExtension {
  constructor() {
    this.queue = null;
  }
  
  start() {
    this.queue = new MessageQueue();
    console.log('[Message Queue Extension] Started');
  }
  
  stop() {
    if (this.queue) {
      this.queue.destroy();
    }
    console.log('[Message Queue Extension] Stopped');
  }
  
  getSettingsPanel() {
    if (this.queue) {
      return this.queue.createSettingsPanel();
    }
    return () => React.createElement('div', {}, 'Settings loading...');
  }
};
