# Documentation for Node.js WebSocket Server

## Overview

This documentation outlines how to interact with the Node.js WebSocket server that facilitates real-time messaging and call notifications using the BuddyBoss Messages API. It is designed for frontend developers working with React, React Native, and Flutter.

### Table of Contents

1. [Getting Started](#getting-started)
2. [WebSocket Connection](#websocket-connection)
3. [Message Types](#message-types)
4. [User  Connection Management](#user-connection-management)
5. [Sending and Receiving Messages](#sending-and-receiving-messages)
6. [Typing Indicator](#typing-indicator)
7. [Call Management](#call-management)
8. [Error Handling](#error-handling)
9. [Example Client Implementations](#example-client-implementations)
10. [API Reference](#api-reference)

---

## Getting Started

### Prerequisites

- **Node.js**: Ensure you have Node.js installed on your development machine.
- **BuddyBoss API**: Access to a BuddyBoss site with the Messages API enabled.
- **WebSocket Client**: Use the WebSocket API in JavaScript, Flutter WebSocket library, etc.

### Installation

1. Clone the repository containing the Node.js server.
2. Navigate to the project directory.
3. Run `npm install` to install the required dependencies.
4. Start the server with `node server.js`.

### WebSocket URL

The WebSocket server runs on the following URL:
ws://localhost:8080


Replace `localhost` with the appropriate server address in production.

---

## WebSocket Connection

To establish a connection to the WebSocket server, use the following code snippet in your frontend application:

### JavaScript (React)

```javascript
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
  console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message from server:', data);
};

socket.onclose = () => {
  console.log('WebSocket connection closed');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
}; 
```

### Flutter
```dart
import 'package:web_socket_channel/web_socket_channel.dart';

final channel = WebSocketChannel.connect(
  Uri.parse('ws://localhost:8080'),
);

channel.stream.listen((message) {
  print('Message from server: $message');
});
```
## Message Types

The server supports the following message types:

### 1. user_connected

Description: Notify the server that a user has connected.

#### Payload:

```json
{
  "type": "user_connected",
  "userId": "USER_ID"
}
```

### 2. join_thread

Description: Join an existing message thread.

#### Payload:

```json
{
  "type": "join_thread",
  "threadId": "THREAD_ID"
}
```

### 3. send_message

Description: Send a message to a user or thread.

#### Payload:

```json
{
  "type": "send_message",
  "recipientId": "RECIPIENT_ID",
  "message": "Hello, this is a message.",
  "threadId": "THREAD_ID",
  "token": "YOUR_API_TOKEN"
}
```

### 4. typing

Description: signal that the user is typing.

#### Payload:

```json
{
  "type": "typing",
  "threadId": "THREAD_ID"
}
```

### 5. call_initiated

Description: Notify users about an initiated call.

#### Payload:

```json
{
  "type": "call_initiated",
  "senderId": "SENDER_ID",
  "recipientId": "RECIPIENT_ID",
  "threadId": "THREAD_ID"
}
```

### 6. offer, answer, ice-candidate

Description: Used for handling WebRTC signaling for audio/video calls.

#### Payload:

```json
// Offer
{
  "type": "offer",
  "offer": "OFFER_SDP",
  "recipientId": "RECIPIENT_ID",
  "senderId": "SENDER_ID",
  "threadId": "THREAD_ID"
}

// Answer
{
  "type": "answer",
  "answer": "ANSWER_SDP",
  "recipientId": "RECIPIENT_ID",
  "senderId": "SENDER_ID",
  "threadId": "THREAD_ID"
}

// ICE Candidate
{
  "type": "ice-candidate",
  "candidate": "ICE_CANDID ATE",
  "recipientId": "RECIPIENT_ID",
  "senderId": "SENDER_ID",
  "threadId": "THREAD_ID"
}
```

### User Connection Management

When a user connects, the server sends a user_connected message to all connected clients. You can use this message to update the online status of users in your application.

### Sending and Receiving Messages

To send a message, use the `send_message` message type. The server will broadcast the message to all clients in the specified thread.

To receive messages, listen for incoming messages on the WebSocket connection. The server will send messages with the `message` type.



### Typing Indicator

To indicate that a user is typing, send a `typing` message to the server. The server will broadcast the typing status to all clients in the specified thread.


### Call Management

The server handles call initiation, offer, answer, and ICE candidate exchange for WebRTC-based audio/video calls. You can use the `call_initiated`, `offer`, `answer`, and `ice-candidate` message types to manage calls in your application.

### Error Handling

```json
{
  "type": "error",
  "message": "Error message"
}
```

## Example Client Implementations

### React

```javascript
import React, { useState, useEffect } from 'react';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingStatus, setTypingStatus] = useState(false);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    setSocket(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prevMessages) => [...prevMessages, data]);
      } else if (data.type === 'typing') {
        setTypingStatus(data.typing);
      }
    };
  }, []);

  const sendMessage = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: 'send_message',
          recipientId: 'RECIPIENT_ID',
          message: 'Hello, this is a message.',
          threadId: 'THREAD_ID',
          token: 'YOUR_API_TOKEN',
        }),
      );
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.send(JSON.stringify({ type: 'typing', threadId: 'THREAD_ID' }));
    }
  };

  return (
    <div>
      <h1>WebSocket Chat</h1>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message.message}</li>
        ))}
      </ul>
      <button onClick={sendMessage}>Send Message</button>
      <button onClick={handleTyping}>Start Typing</button>
      {typingStatus ? <p>Typing...</p> : null}
    </div>
  );
}

export default App;
```

### Flutter

```dart
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketChat extends StatefulWidget {
  @override
  _WebSocketChatState createState() => _WebSocketChatState();
}

class _WebSocketChatState extends State<WebSocketChat> {
  final channel = WebSocketChannel.connect(Uri.parse('ws://localhost:8080'));
  final _messages = <String>[];
  bool _typingStatus = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('WebSocket Chat'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  return ListTile(title: Text(_messages[index]));
                },
              ),
            ),
            ElevatedButton(
              onPressed: () {
                channel.sink.add(
                  jsonEncode({
                    'type': 'send_message',
                    'recipientId': 'RECIPIENT_ID',
                    'message': 'Hello, this is a message.',
                    'threadId': 'THREAD_ID',
                    'token': 'YOUR_API_TOKEN',
                  }),
                );
              },
              child: Text('Send Message'),
            ),
            ElevatedButton(
              onPressed: () {
                channel.sink.add(jsonEncode({'type': 'typing', 'threadId': 'THREAD_ID'}));
              },
              child: Text('Start Typing'),
            ),
            _typingStatus ? Text('Typing...') : null,
          ],
        ),
      ),
    );
  }

  @override
  void initState() {
    super .initState();
    channel.stream.listen((message) {
      setState(() {
        if (message.contains('message')) {
          _messages.add(message);
        } else if (message.contains('typing')) {
          _typingStatus = true;
          Future.delayed(Duration(seconds: 3)).then((_) {
            setState(() {
              _typingStatus = false;
            });
          });
        }
      });
    });
  }
}
```

## API Reference

### BuddyBoss Messages API

The [BuddyBoss Messages API](https://www.buddyboss.com/resources/api/#api-Messages) is used for creating and managing message threads, sending messages, and retrieving message history. You can find the API documentation on the BuddyBoss website.




