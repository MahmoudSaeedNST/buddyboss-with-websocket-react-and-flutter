const serverUrl = 'ws://localhost:8080'; // Change this if your server is running on a different URL
let socket;
let userId;
let recipientId; // Now declared but not initialized
const threadId = 1; // Fixed thread ID for testing

document.getElementById('connectBtn').addEventListener('click', () => {
    userId = document.getElementById('userId').value;
    recipientId = document.getElementById('recipientId').value; // Get recipient ID from input
    if (!userId || !recipientId) {
        alert('Please enter both User ID and Recipient ID');
        return;
    }
    connectWebSocket(userId, recipientId);
});

document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value;
    if (messageText) {
        sendMessage(messageText);
        messageInput.value = '';
    }
});

// Detect typing
document.getElementById('messageInput').addEventListener('input', () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'typing', userId, threadId }));
    }
});

function connectWebSocket(userId, recipientId) {
    socket = new WebSocket(serverUrl);

    socket.onopen = () => {
        console.log('Connected to server');
        document.getElementById('user-status').innerText = `User  ${userId} connected`;

        // Send user connection information
        socket.send(JSON.stringify({ type: 'user_connected', userId, recipientId }));
        
        // Join the thread
        socket.send(JSON.stringify({ type: 'join_thread', threadId, userId }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    socket.onclose = () => {
        console.log('Disconnected from server');
        document.getElementById('user-status').innerText = 'Disconnected';
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function sendMessage(messageText) {
    const messageData = {
        type: 'send_message',
        recipientId: recipientId, // Use dynamic recipient ID
        message: messageText,
        threadId: threadId,
        token: 'yourToken' // Replace with actual token if needed
    };
    socket.send(JSON.stringify(messageData));
}

function handleMessage(data) {
    switch (data.type) {
        case 'message':
            displayMessage(data);
            break;
        case 'online_status':
            updateOnlineStatus(data);
            break;
        case 'typing':
            showTypingStatus(data);
            break;
        case 'connected_users':
            displayConnectedUsers(data.users); // New case for connected users
            break;
        default:
            console.error('Unknown message type:', data.type);
    }
}

function displayMessage(data) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `<div><strong>${data.senderId}:</strong> ${data.message}</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
}

function updateOnlineStatus(data) {
    const userStatusDiv = document.getElementById('user-status');
    userStatusDiv.innerText = `User  ${data.userId} is ${data.online ? 'online' : 'offline'}`;
}

function showTypingStatus(data) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `<div><strong>${data.userId} is typing...</strong></div>`;
    setTimeout(() => {
        messagesDiv.removeChild(messagesDiv.lastChild);
    }, 3000); // Remove typing status after 3 seconds
}

function displayConnectedUsers(users) {
    const usersDiv = document.getElementById('connected-users');
    usersDiv.innerHTML = ''; // Clear previous list
    users.forEach ((user) => {
        usersDiv.innerHTML += `<div><strong>${user}</strong></div>`;
    });
}