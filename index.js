const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// BuddyBoss API configuration
const buddybossApiUrl = 'http://localhost:3000';

// Maps to store WebSocket connections and user statuses
const threadConnections = new Map();
const typingStatuses = new Map();
const onlineUsers = new Map();

wss.on('connection', (ws) => {
  let userId;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'user_connected':
        userId = data.userId; // Initialize userId
        onlineUsers.set(userId, ws);
        broadcastOnlineStatus(userId, true);
        break;

      case 'join_thread':
        handleJoinThread(data.threadId, userId, ws);
        break;

      case 'send_message':
        handleSendMessage(data, userId);
        break;

      case 'typing':
        handleTyping(data.threadId, userId);
        break;

      case 'offer':
        handleOffer(data);
        break;

      case 'answer':
        handleAnswer(data);
        break;

      case 'ice-candidate':
        handleIceCandidate(data);
        break;

      case 'call_initiated':
        handleCallInitiation(data);
        break;

      default:
        console.error('Unknown message type:', data.type);
    }
  });

  ws.on('close', () => {
    handleDisconnect(userId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle user joining a thread
function handleJoinThread(threadId, userId, ws) {
  if (!threadConnections.has(threadId)) {
    threadConnections.set(threadId, new Map());
  }
  threadConnections.get(threadId).set(userId, ws);
}

// Handle sending messages
function handleSendMessage(data, senderId) {
  const { recipientId, message: messageText, threadId, token } = data;

  if (!threadId) {
    const messageData = {
      message: messageText,
      recipients: [recipientId],
      sender_id: senderId,
    };

    axios.post(`${buddybossApiUrl}/messages`, messageData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      const newThreadId = response.data.id;
      sendMessageToThread(newThreadId, senderId, recipientId, messageText, token);
    })
    .catch((error) => {
      console.error('Error creating thread:', error.response ? error.response.data : error.message);
      // Send error back to the client
      const errorMessage = {
        type: 'error',
        message: 'Failed to create a new message thread. Please try again.',
      };
      if (onlineUsers.has(recipientId)) {
        onlineUsers.get(recipientId).send(JSON.stringify(errorMessage));
      }
    });
  } else {
    sendMessageToThread(threadId, senderId, recipientId, messageText, token);
  }
}

// Send message to all clients in the thread
function sendMessageToThread(threadId, senderId, recipientId, messageText, token) {
  const messageData = {
    message: messageText,
    recipients: [recipientId],
    sender_id: senderId,
    id: threadId,
  };

  axios.post(`${buddybossApiUrl}/messages`, messageData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  .then(() => {
    const clients = threadConnections.get(threadId);
    if (!clients) {
      console.error(`No clients found for thread ID: ${threadId}`);
      return;
    }
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) { // Check if the connection is open
        client.send(JSON.stringify({
          type: 'message',
          senderId,
          recipientId,
          message: messageText,
          threadId,
        }));
      }
    });
  })
  .catch((error) => {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
  });
}


/* function clearTypingStatus(userId) {
  wss.clients.forEach((client) => {
      client.send(JSON.stringify({ type: 'clear_typing', userId }));
  });
} */

// Handle typing status
function handleTyping(threadId, userId) {
  typingStatuses.set(userId, true);
  broadcastTypingStatus(userId, threadId);

  // Clear typing status after 3 seconds
  setTimeout(() => {
    typingStatuses.delete(userId);
    broadcastTypingStatus(userId, threadId);
  }, 3000);
}

// Handle incoming offer
function handleOffer(data) {
  const { offer, recipientId, senderId, threadId } = data;
  const recipientSocket = threadConnections.get(threadId)?.get(recipientId);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(JSON.stringify({
      type: 'offer',
      offer,
      senderId,
      threadId,
    }));
  }
}

// Handle incoming answer
function handleAnswer(data) {
  const { answer, recipientId, senderId, threadId } = data;
  const senderSocket = threadConnections.get(threadId)?.get(senderId);
  if (senderSocket && senderSocket.readyState === WebSocket.OPEN) {
    senderSocket.send(JSON.stringify({
      type: 'answer',
      answer,
      recipientId,
      threadId,
    }));
  }
}

// Handle incoming ice candidate
function handleIceCandidate(data) {
  const { candidate, recipientId, senderId, threadId } = data;
  const recipientSocket = threadConnections.get(threadId)?.get(recipientId);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(JSON.stringify({
      type: 'ice-candidate',
      candidate,
      senderId,
      threadId,
    }));
  }
}

// Handle call initiation
function handleCallInitiation(data) {
  const { senderId, recipientId } = data;
  const callerMessageText = `You (${senderId}) have called ${recipientId}`;
  const recipientMessageText = `${senderId} has called you (${recipientId})`;
  const callerSocket = threadConnections.get(data.threadId)?.get(senderId);
  const recipientSocket = threadConnections.get(data.threadId)?.get(recipientId);
  if (callerSocket && callerSocket.readyState === WebSocket.OPEN) {
    callerSocket.send(JSON.stringify({
      type: 'call_notification',
      message: callerMessageText,
      senderId,
      recipientId,
      threadId: data.threadId,
    }));
  }
  
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(JSON.stringify({
      type: 'call_notification',
      message: recipientMessageText,
      senderId,
      recipientId,
      threadId: data.threadId,
    }));
  }
}

// Handle user disconnection
function handleDisconnect(userId) {
  if (userId) {
    onlineUsers.delete(userId);
    broadcastOnlineStatus(userId, false);
  }
}

// Broadcast online status to all connected users
function broadcastOnlineStatus(userId, online) {
  const message = JSON.stringify({
    type: 'online_status',
    userId,
    online,
  });

  onlineUsers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) { // Check if the connection is open
      client.send(message);
    }
  });
}

// Broadcast typing status to all clients in the thread
function broadcastTypingStatus(userId, threadId) {
  const threadClients = Array.from(threadConnections.get(threadId).values());
  threadClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) { // Check if the connection is open
      client.send(JSON.stringify({
        type: 'typing',
        userId,
        typing: typingStatuses.get(userId),
      }));
    }
  });
}




server.listen(8080, () => {
  console.log('Server started on port 8080');
});