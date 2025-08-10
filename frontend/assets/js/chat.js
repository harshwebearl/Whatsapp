// Modern WhatsApp Clone Chat Application
class ChatApp {
    constructor() {
        this.socket = null;
        this.username = '';
        this.userId = '';
        this.currentChat = null;
        this.chats = [];
        this.messages = new Map();
        this.onlineUsers = [];
        this.typingUsers = new Set();
        this.replyToMessage = null;
        this.searchQuery = '';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.userStatus = localStorage.getItem('userStatus') || 'Available';
        this.apiBaseUrl = 'http://localhost:5001/api';
        this.authToken = localStorage.getItem('authToken');
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.loadUserInfo();
        this.initializeSocket();
        this.setupEventListeners();
        this.loadEmojis();
        this.loadContacts().then(() => {
            this.applyTheme();
            this.loadChats();
            this.showWelcomeScreen();
        });
    }

    initializeElements() {
        // Main containers
        this.appContainer = document.getElementById('appContainer');
        this.chatSidebar = document.getElementById('chatSidebar');
        this.chatArea = document.getElementById('chatArea');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.activeChat = document.getElementById('activeChat');
        
        // Sidebar elements
        this.sidebarProfilePhoto = document.getElementById('sidebarProfilePhoto');
        this.sidebarUserName = document.getElementById('sidebarUserName');
        this.statusText = document.getElementById('statusText');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.statusToggle = document.getElementById('statusToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.mainMenuBtn = document.getElementById('mainMenuBtn');
        this.searchInput = document.getElementById('searchInput');
        this.chatList = document.getElementById('chatList');
        
        // Chat area elements
        this.chatProfilePhoto = document.getElementById('chatProfilePhoto');
        this.chatName = document.getElementById('chatName');
        this.chatStatus = document.getElementById('chatStatus');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messagesWrapper = document.getElementById('messagesWrapper');
        this.replyPreview = document.getElementById('replyPreview');
        this.messageInput = document.getElementById('messageInput');
        this.emojiButton = document.getElementById('emojiButton');
        this.attachButton = document.getElementById('attachButton');
        this.voiceButton = document.getElementById('voiceButton');
        this.sendButton = document.getElementById('sendButton');
        
        // Modals and sidebars
        this.newChatModal = document.getElementById('newChatModal');
        this.statusMenu = document.getElementById('statusMenu');
        this.mainMenu = document.getElementById('mainMenu');
        this.emojiPicker = document.getElementById('emojiPicker');
        this.attachmentMenu = document.getElementById('attachmentMenu');
        
        // File inputs
        this.fileInput = document.getElementById('fileInput');
        this.imageInput = document.getElementById('imageInput');
        this.videoInput = document.getElementById('videoInput');
        this.audioInput = document.getElementById('audioInput');
        this.documentInput = document.getElementById('documentInput');
    }

    loadUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const user = JSON.parse(userInfo);
            this.username = user.name || user.email || 'Anonymous';
            this.userId = user.id || Date.now().toString();
            this.loadProfileData(user);
        } else {
            this.username = `User${Math.floor(Math.random() * 1000)}`;
            this.userId = Date.now().toString();
        }
    }

    async makeApiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async loadChats() {
        try {
            if (!this.authToken) {
                this.loadSampleChats();
                return;
            }

            const chats = await this.makeApiRequest('/chat');
            this.chats = chats.map(chat => ({
                id: chat.id,
                name: chat.name,
                lastMessage: chat.lastMessage ? chat.lastMessage.content : '',
                timestamp: chat.timestamp,
                unreadCount: chat.unreadCount,
                online: false,
                avatar: chat.photo || '👤'
            }));
            this.renderChatList();
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.loadSampleChats();
        }
    }

    loadSampleChats() {
        this.chats = [
            {
                id: '1',
                name: 'John Doe',
                lastMessage: 'Hey, how are you?',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                unreadCount: 2,
                online: true,
                avatar: '👤'
            },
            {
                id: '2',
                name: 'Jane Smith',
                lastMessage: 'Meeting at 3 PM',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                unreadCount: 0,
                online: false,
                avatar: '👤'
            }
        ];
        this.renderChatList();
    }

    renderChatList() {
        if (!this.chatList) return;
        
        this.chatList.innerHTML = '';
        this.chats.forEach(chat => {
            const chatElement = this.createChatElement(chat);
            this.chatList.appendChild(chatElement);
        });
    }

    createChatElement(chat) {
        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-item';
        chatDiv.dataset.chatId = chat.id;
        chatDiv.onclick = () => this.selectChat(chat);

        const time = this.formatTime(chat.timestamp);
        const unreadBadge = chat.unreadCount > 0 ? `<span class="chat-unread">${chat.unreadCount}</span>` : '';

        chatDiv.innerHTML = `
            <div class="chat-avatar">
                ${chat.avatar}
                ${chat.online ? '<span class="online-indicator"></span>' : ''}
            </div>
            <div class="chat-details">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-last-message">${chat.lastMessage}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${time}</div>
                ${unreadBadge}
            </div>
        `;

        return chatDiv;
    }

    selectChat(chat) {
        this.currentChat = chat;
        this.showActiveChat();
        this.loadChatMessages(chat.id);
        this.updateChatHeader(chat);
        
        if (chat.unreadCount > 0) {
            chat.unreadCount = 0;
            this.renderChatList();
        }
    }

    showActiveChat() {
        this.welcomeScreen.style.display = 'none';
        this.activeChat.style.display = 'block';
    }

    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.activeChat.style.display = 'none';
        this.currentChat = null;
    }

    updateChatHeader(chat) {
        if (this.chatName) this.chatName.textContent = chat.name;
        if (this.chatStatus) this.chatStatus.textContent = chat.online ? 'Online' : 'Offline';
        if (this.chatProfilePhoto) this.chatProfilePhoto.src = chat.avatar;
    }

    loadChatMessages(chatId) {
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        
        const chatMessages = this.messages.get(chatId);
        this.renderMessages(chatMessages);
    }

    renderMessages(messages) {
        if (!this.messagesWrapper) return;
        
        this.messagesWrapper.innerHTML = '';
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.messagesWrapper.appendChild(messageElement);
        });
        
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.userId === this.userId ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = message.id;

        let messageHTML = '';
        
        if (message.replyTo) {
            messageHTML += `
                <div class="reply-preview">
                    <div class="reply-header">
                        <span class="reply-username">${message.replyUsername || 'You'}</span>
                    </div>
                    <div class="reply-text">${message.replyText}</div>
                </div>
            `;
        }

        if (message.type === 'voice') {
            messageHTML += `
                <div class="message-content">
                    <div class="voice-message">
                        <audio controls>
                            <source src="${message.audioUrl}" type="audio/wav">
                        </audio>
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        <span class="message-status ${message.status}">
                            ${this.getStatusIcon(message.status)}
                        </span>
                    </div>
                </div>
            `;
        } else if (message.type === 'file') {
            messageHTML += `
                <div class="message-content">
                    <div class="file-message">
                        ${this.getFilePreview(message)}
                        <div class="file-details">
                            <span class="file-name">${message.fileName}</span>
                            <span class="file-size">${this.formatFileSize(message.fileSize)}</span>
                        </div>
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        <span class="message-status ${message.status}">
                            ${this.getStatusIcon(message.status)}
                        </span>
                    </div>
                </div>
            `;
        } else {
            messageHTML += `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-meta">
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        <span class="message-status ${message.status}">
                            ${this.getStatusIcon(message.status)}
                        </span>
                    </div>
                </div>
            `;
        }

        messageHTML += `
            <div class="message-actions">
                <button onclick="chatApp.replyToMessage('${message.id}')" title="Reply">
                    <i class="fas fa-reply"></i>
                </button>
                <button onclick="chatApp.forwardMessage('${message.id}')" title="Forward">
                    <i class="fas fa-share"></i>
                </button>
                <button onclick="chatApp.copyMessage('${message.id}')" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                ${message.userId === this.userId ? 
                    `<button onclick="chatApp.deleteMessage('${message.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>` : ''
                }
            </div>
        `;

        messageDiv.innerHTML = messageHTML;
        return messageDiv;
    }

    getFilePreview(message) {
        if (message.fileType.startsWith('image/')) {
            return `<img src="${message.fileData}" alt="${message.fileName}" class="file-preview">`;
        } else if (message.fileType.startsWith('video/')) {
            return `<video controls class="file-preview"><source src="${message.fileData}" type="${message.fileType}"></video>`;
        } else {
            return `<div class="file-info"><i class="fas fa-file"></i> ${message.fileName}</div>`;
        }
    }

    applyTheme() {
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (this.darkModeToggle) {
                this.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (this.darkModeToggle) {
                this.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyTheme();
    }

    async loadContacts() {
        try {
            if (!this.authToken) {
                this.contacts = [
                    { id: 1, name: 'John Doe', phone: '+1234567890', avatar: '👤' },
                    { id: 2, name: 'Jane Smith', phone: '+0987654321', avatar: '👤' },
                    { id: 3, name: 'Mike Johnson', phone: '+1122334455', avatar: '👤' }
                ];
                return;
            }

            const users = await this.searchUsers('');
            this.contacts = users.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.mobile,
                avatar: user.photo || '👤'
            }));
        } catch (error) {
            console.error('Failed to load contacts:', error);
            this.contacts = [
                { id: 1, name: 'John Doe', phone: '+1234567890', avatar: '👤' },
                { id: 2, name: 'Jane Smith', phone: '+0987654321', avatar: '👤' },
                { id: 3, name: 'Mike Johnson', phone: '+1122334455', avatar: '👤' }
            ];
        }
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to server');
            this.socket.emit('join chat', {
                userId: this.userId,
                username: this.username
            });
        });

        this.socket.on('chat message', (messageData) => {
            this.addMessage(messageData);
            this.playNotificationSound();
        });

        this.socket.on('user typing', (userData) => {
            this.showTypingIndicator(userData.username);
        });

        this.socket.on('user stopped typing', (userData) => {
            this.hideTypingIndicator(userData.username);
        });
    }

    setupEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (this.emojiButton) {
            this.emojiButton.addEventListener('click', () => this.toggleEmojiPicker());
        }
        
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => this.toggleVoiceRecording());
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.filterChats();
            });
        }

        if (this.attachButton) {
            this.attachButton.addEventListener('click', () => this.toggleAttachmentMenu());
        }

        if (this.darkModeToggle) {
            this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        }

        if (this.statusToggle) {
            this.statusToggle.addEventListener('click', () => this.toggleStatusMenu());
        }

        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.showNewChatModal());
        }

        if (this.mainMenuBtn) {
            this.mainMenuBtn.addEventListener('click', () => this.toggleMainMenu());
        }

        this.setupFileInputs();
        document.addEventListener('click', (e) => this.handleClickOutside(e));
    }

    setupFileInputs() {
        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'image'));
        }
        if (this.videoInput) {
            this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e, 'video'));
        }
        if (this.audioInput) {
            this.audioInput.addEventListener('change', (e) => this.handleFileSelect(e, 'audio'));
        }
        if (this.documentInput) {
            this.documentInput.addEventListener('change', (e) => this.handleFileSelect(e, 'document'));
        }
    }

    handleFileSelect(event, type) {
        const file = event.target.files[0];
        if (file) {
            this.sendFileMessage(file, type);
        }
        event.target.value = '';
    }

    handleClickOutside(event) {
        if (this.emojiPicker && !this.emojiPicker.contains(event.target) && !this.emojiButton?.contains(event.target)) {
            this.emojiPicker.style.display = 'none';
        }
        
        if (this.attachmentMenu && !this.attachmentMenu.contains(event.target) && !this.attachButton?.contains(event.target)) {
            this.attachmentMenu.style.display = 'none';
        }
        
        if (this.statusMenu && !this.statusMenu.contains(event.target) && !this.statusToggle?.contains(event.target)) {
            this.statusMenu.style.display = 'none';
        }
        
        if (this.mainMenu && !this.mainMenu.contains(event.target) && !this.mainMenuBtn?.contains(event.target)) {
            this.mainMenu.style.display = 'none';
        }
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.currentChat) return;

        const messageData = {
            id: Date.now().toString(),
            text: text,
            username: this.username,
            userId: this.userId,
            chatId: this.currentChat.id,
            timestamp: new Date().toISOString(),
            status: 'sending',
            replyTo: this.replyToMessage ? this.replyToMessage.id : null,
            replyText: this.replyToMessage ? this.replyToMessage.text : null
        };

        if (this.socket) {
            this.socket.emit('chat message', messageData);
        }
        
        this.addMessage(messageData);
        this.messageInput.value = '';
        this.replyToMessage = null;
        this.hideReplyPreview();
        
        this.updateChatLastMessage(this.currentChat.id, text);
    }

    addMessage(messageData) {
        if (!this.currentChat) return;
        
        const chatId = messageData.chatId;
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        
        const chatMessages = this.messages.get(chatId);
        chatMessages.push(messageData);
        
        if (this.currentChat.id === chatId) {
            const messageElement = this.createMessageElement(messageData);
            this.messagesWrapper.appendChild(messageElement);
            this.scrollToBottom();
        }
        
        setTimeout(() => {
            if (this.socket) {
                this.socket.emit('mark messages read', messageData.id);
            }
        }, 2000);
    }

    updateChatLastMessage(chatId, message) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = message;
            chat.timestamp = new Date().toISOString();
            this.renderChatList();
        }
    }

    showTypingIndicator(username) {
        if (!this.typingUsers.has(username)) {
            this.typingUsers.add(username);
            this.updateTypingIndicator();
        }
    }

    hideTypingIndicator(username) {
        this.typingUsers.delete(username);
        this.updateTypingIndicator();
    }

    updateTypingIndicator() {
        let typingDiv = document.getElementById('typingIndicator');
        if (!typingDiv) {
            typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'typing-indicator';
            if (this.messagesWrapper) {
                this.messagesWrapper.appendChild(typingDiv);
            }
        }

        if (this.typingUsers.size > 0) {
            const users = Array.from(this.typingUsers);
            typingDiv.innerHTML = `
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <span class="typing-text">${users.join(', ')} typing...</span>
            `;
            typingDiv.style.display = 'block';
        } else {
            typingDiv.style.display = 'none';
        }
    }

    replyToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const messageText = messageElement.querySelector('.message-text')?.textContent || '';
            this.replyToMessage = { id: messageId, text: messageText };
            this.showReplyPreview();
            this.messageInput.focus();
        }
    }

    showReplyPreview() {
        if (!this.replyPreview) return;
        
        this.replyPreview.innerHTML = `
            <div class="reply-header">
                <span class="reply-username">Replying to message</span>
                <button class="cancel-reply" onclick="chatApp.hideReplyPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="reply-text">${this.replyToMessage.text}</div>
        `;
        this.replyPreview.style.display = 'flex';
    }

    hideReplyPreview() {
        if (this.replyPreview) {
            this.replyPreview.style.display = 'none';
        }
        this.replyToMessage = null;
    }

    forwardMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const messageText = messageElement.querySelector('.message-text')?.textContent || '';
            const username = messageElement.classList.contains('sent') ? this.username : 'Unknown';
            
            const forwardData = {
                id: Date.now().toString(),
                text: messageText,
                username: this.username,
                userId: this.userId,
                chatId: this.currentChat.id,
                timestamp: new Date().toISOString(),
                status: 'sending',
                forwarded: true,
                originalSender: username
            };

            if (this.socket) {
                this.socket.emit('forward message', forwardData);
            }
            this.addMessage(forwardData);
        }
    }

    copyMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const messageText = messageElement.querySelector('.message-text')?.textContent || '';
            navigator.clipboard.writeText(messageText).then(() => {
                this.showToast('Message copied to clipboard!');
            });
        }
    }

    deleteMessage(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            if (this.socket) {
                this.socket.emit('delete message', messageId);
            }
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
        }
    }

    loadEmojis() {
        if (!this.emojiPicker) return;
        
        const emojiCategories = {
            'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
            'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅'],
            'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒']
        };
        
        this.emojiPicker.innerHTML = '';
        
        Object.entries(emojiCategories).forEach(([category, emojis]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'emoji-category';
            categoryDiv.innerHTML = `<h4>${category}</h4>`;
            
            const emojiGrid = document.createElement('div');
            emojiGrid.className = 'emoji-grid';
            
            emojis.forEach(emoji => {
                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'emoji';
                emojiSpan.textContent = emoji;
                emojiSpan.onclick = () => {
                    if (this.messageInput) {
                        this.messageInput.value += emoji;
                        this.messageInput.focus();
                    }
                    this.emojiPicker.style.display = 'none';
                };
                emojiGrid.appendChild(emojiSpan);
            });
            
            categoryDiv.appendChild(emojiGrid);
            this.emojiPicker.appendChild(categoryDiv);
        });
    }

    toggleEmojiPicker() {
        if (!this.emojiPicker) return;
        
        if (this.emojiPicker.style.display === 'none' || !this.emojiPicker.style.display) {
            this.emojiPicker.style.display = 'block';
        } else {
            this.emojiPicker.style.display = 'none';
        }
    }

    toggleAttachmentMenu() {
        if (!this.attachmentMenu) return;
        
        if (this.attachmentMenu.style.display === 'none' || !this.attachmentMenu.style.display) {
            this.attachmentMenu.style.display = 'block';
        } else {
            this.attachmentMenu.style.display = 'none';
        }
    }

    toggleVoiceRecording() {
        if (!this.isRecording) {
            this.startVoiceRecording();
        } else {
            this.stopVoiceRecording();
        }
    }

    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.sendVoiceMessage(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            if (this.voiceButton) {
                this.voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showToast('Error starting voice recording');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            if (this.voiceButton) {
                this.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }

    async sendVoiceMessage(audioBlob) {
        if (!this.currentChat) return;
        
        const messageData = {
            id: Date.now().toString(),
            type: 'voice',
            audioBlob: audioBlob,
            username: this.username,
            userId: this.userId,
            chatId: this.currentChat.id,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        if (this.socket) {
            this.socket.emit('voice message', messageData);
        }
        this.addMessage(messageData);
    }

    async sendFileMessage(file, type) {
        if (!this.currentChat) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const messageData = {
                id: Date.now().toString(),
                type: 'file',
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: e.target.result,
                username: this.username,
                userId: this.userId,
                chatId: this.currentChat.id,
                timestamp: new Date().toISOString(),
                status: 'sending'
            };

            if (this.socket) {
                this.socket.emit('file message', messageData);
            }
            this.addMessage(messageData);
        };
        reader.readAsDataURL(file);
    }

    filterChats() {
        if (!this.chatList) return;
        
        const chatItems = this.chatList.querySelectorAll('.chat-item');
        chatItems.forEach(chatItem => {
            const chatName = chatItem.querySelector('.chat-name').textContent.toLowerCase();
            const lastMessage = chatItem.querySelector('.chat-last-message').textContent.toLowerCase();
            const query = this.searchQuery.toLowerCase();
            
            if (chatName.includes(query) || lastMessage.includes(query)) {
                chatItem.style.display = 'flex';
            } else {
                chatItem.style.display = 'none';
            }
        });
    }

    showNewChatModal() {
        if (this.newChatModal) {
            this.newChatModal.style.display = 'block';
            this.renderContacts();
        }
    }

    renderContacts(contacts = null) {
        const contactList = document.getElementById('contactList');
        if (!contactList) return;

        const contactsToRender = contacts || this.contacts;
        
        contactList.innerHTML = '';
        contactsToRender.forEach(contact => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            contactDiv.onclick = () => this.createNewChat(contact.id);

            contactDiv.innerHTML = `
                <div class="contact-avatar">
                    <img src="${contact.avatar || '../assets/img/default.png'}" alt="${contact.name}">
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone || contact.mobile || ''}</div>
                </div>
            `;

            contactList.appendChild(contactDiv);
        });
    }

    async createNewChat(participantId) {
        try {
            if (!this.authToken) {
                this.showToast('Please login to create new chats');
                return;
            }

            const response = await this.makeApiRequest('/chat', {
                method: 'POST',
                body: JSON.stringify({
                    participantId,
                    chatType: 'private'
                })
            });

            const newChat = {
                id: response.id,
                name: response.name,
                lastMessage: '',
                timestamp: response.timestamp,
                unreadCount: 0,
                online: false,
                avatar: response.photo || '👤'
            };

            this.chats.unshift(newChat);
            this.renderChatList();
            this.selectChat(newChat);
            this.closeModal('newChatModal');

        } catch (error) {
            console.error('Failed to create chat:', error);
            this.showToast('Failed to create new chat');
        }
    }

    toggleStatusMenu() {
        if (this.statusMenu) {
            this.statusMenu.style.display = this.statusMenu.style.display === 'block' ? 'none' : 'block';
        }
    }

    toggleMainMenu() {
        if (this.mainMenu) {
            this.mainMenu.style.display = this.mainMenu.style.display === 'block' ? 'none' : 'block';
        }
    }

    setUserStatus(status) {
        this.userStatus = status;
        localStorage.setItem('userStatus', status);
        if (this.statusText) {
            this.statusText.textContent = status;
        }
        this.toggleStatusMenu();
    }

    showSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'block';
        }
    }

    showHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.style.display = 'block';
        }
    }

    startVoiceCall() {
        const voiceCallModal = document.getElementById('voiceCallModal');
        if (voiceCallModal) {
            voiceCallModal.style.display = 'block';
        }
    }

    startVideoCall() {
        const videoCallModal = document.getElementById('videoCallModal');
        if (videoCallModal) {
            videoCallModal.style.display = 'block';
        }
    }

    endCall() {
        const voiceCallModal = document.getElementById('voiceCallModal');
        const videoCallModal = document.getElementById('videoCallModal');
        
        if (voiceCallModal) {
            voiceCallModal.style.display = 'none';
        }
        if (videoCallModal) {
            videoCallModal.style.display = 'none';
        }
    }

    playNotificationSound() {
        const notificationSound = document.getElementById('notificationSound');
        if (notificationSound) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    scrollToBottom() {
        if (this.messagesWrapper) {
            this.messagesWrapper.scrollTop = this.messagesWrapper.scrollHeight;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStatusIcon(status) {
        switch (status) {
            case 'sending': return '<i class="fas fa-clock"></i>';
            case 'sent': return '<i class="fas fa-check"></i>';
            case 'delivered': return '<i class="fas fa-check-double"></i>';
            case 'read': return '<i class="fas fa-check-double" style="color: #34b7f1;"></i>';
            default: return '<i class="fas fa-clock"></i>';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadProfileData(user) {
        if (this.sidebarUserName) {
            this.sidebarUserName.textContent = user.name || 'Unknown User';
        }
        if (this.statusText) {
            this.statusText.textContent = this.userStatus;
        }
        if (this.sidebarProfilePhoto && user.photo && user.photo !== 'default.png') {
            this.sidebarProfilePhoto.src = `../uploads/${user.photo}`;
        }
    }

    async searchUsers(query) {
        try {
            if (!this.authToken) {
                return [];
            }

            const users = await this.makeApiRequest(`/chat/users/search?query=${encodeURIComponent(query)}`);
            return users;
        } catch (error) {
            console.error('Failed to search users:', error);
            return [];
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Global functions for UI interactions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleSidebar(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function viewFullProfile() {
    window.location.href = '../profile/view.html';
}

function editPhoto() {
    document.getElementById('imageInput').click();
}

function editName() {
    const newName = prompt('Enter new name:');
    if (newName && newName.trim()) {
        document.getElementById('displayName').textContent = newName.trim();
        document.getElementById('sidebarUserName').textContent = newName.trim();
        document.getElementById('profileName').textContent = newName.trim();
        chatApp.showToast('Name updated successfully');
    }
}

function editPhone() {
    const newPhone = prompt('Enter new phone number:');
    if (newPhone && newPhone.trim()) {
        document.getElementById('displayPhone').textContent = newPhone.trim();
        chatApp.showToast('Phone number updated successfully');
    }
}

function editAbout() {
    const newAbout = prompt('Enter new about text:');
    if (newAbout && newAbout.trim()) {
        document.getElementById('profileAbout').textContent = newAbout.trim();
        document.getElementById('statusText').textContent = newAbout.trim();
        document.getElementById('profileStatus').textContent = newAbout.trim();
        chatApp.showToast('About text updated successfully');
    }
}

function editFullProfile() {
    window.location.href = '../profile/edit.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');

    if (!token || !userInfo) {
        alert('You need to login first to join the chat room!');
        window.location.href = '../auth/login.html';
        return;
    }
    
    window.chatApp = new ChatApp();
});
