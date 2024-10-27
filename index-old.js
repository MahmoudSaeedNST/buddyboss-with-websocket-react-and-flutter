const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Store messages in memory (consider using a database)
const messages = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  // Handle new message
  socket.on('new message', (data) => {
    const { id, subject, message, recipients, sender_id } = data;
    const threadId = id || generateThreadId(); // generate a new thread ID if not provided
    const messageData = { subject, message, recipients, sender_id };

    // Store the message
    if (!messages[threadId]) {
      messages[threadId] = [];
    }
    messages[threadId].push(messageData);

    // Broadcast the message to all connected users
    
    io.emit('new message', { threadId, messageData });
  });

  // Handle reply to an existing thread
  socket.on('reply message', (data) => {
    const { id, message } = data;
    if (messages[id]) {
      messages[id].push({ message });
      io.emit('new message', { threadId: id, messageData: { message } });
    }
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected');
  });
});

// New endpoint to receive messages from PHP
app.post('/send-message', (req, res) => {
  const { sender, message, type, recipient } = req.body;

  // Create a new message object
  const messageData = {
    subject: type, // Use type as subject for demonstration
    message,
    recipients: [recipient], // Assuming single recipient for simplicity
    sender_id: sender,
  };

  // Emit the new message to all connected clients
  io.emit('new message', { threadId: generateThreadId(), messageData });
  
  // Respond to the PHP request
  res.status(200).json({ status: 'success', message: 'Message sent' });
});


app.get('/', (req, res) => {

    res.sendFile(__dirname + '/index.html');
  
  });

server.listen(3000, () => {
  console.log('listening on *:3000');
});

// Helper function to generate a new thread ID
function generateThreadId() {
  return Math.floor(Math.random() * 100000);
}