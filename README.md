# Real-Time Chat Application (MERN + Socket.io)

This project is a practical full-stack chat app built with the MERN stack, Socket.io, MongoDB, Cloudinary, and WebRTC. It keeps the structure simple enough for a student project, but now covers richer real-time features that are useful in interviews and portfolio demos.

## Features

- JWT-based signup and login
- One-to-one real-time messaging
- Group chat creation and member management
- Message persistence in MongoDB
- Typing indicators
- Real-time sent, delivered, and seen states
- Emoji reactions on messages
- File, image, and voice-note sharing through Cloudinary
- Unread chat badges and browser notifications
- Online/offline presence tracking
- Peer-to-peer audio and video calling with WebRTC signaling over Socket.io

## Tech Stack

- React
- Vite
- Node.js
- Express
- MongoDB Atlas or local MongoDB
- Mongoose
- Socket.io
- JWT
- bcryptjs
- Cloudinary
- Multer
- Axios
- WebRTC

## Project Structure

```text
server/
  config/
  controllers/
  middleware/
  models/
  routes/
  socket/
  utils/
  server.js

client/
  src/
    components/
    context/
    pages/
    services/
```

## Setup

### 1. Backend install

```bash
cd server
npm install
```

Create `server/.env` from `server/.env.example`.

Example:

```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/mern_chat_app?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_secret_key
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Frontend install

```bash
cd client
npm install
```

Create `client/.env` from `client/.env.example`.

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run the app

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Frontend URL: `http://localhost:5173`  
Backend URL: `http://localhost:5000`

## Main REST APIs

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Users

- `GET /api/users`

### Chats

- `GET /api/chats`
- `POST /api/chats/direct`
- `POST /api/chats/group`
- `PATCH /api/chats/:chatId/members`
- `DELETE /api/chats/:chatId/members/:memberId`

### Messages

- `GET /api/messages/chat/:chatId`
- `GET /api/messages/:user1/:user2`
- `POST /api/messages`
- `PATCH /api/messages/read/:chatId`
- `PATCH /api/messages/:messageId/reactions`

### Uploads

- `POST /api/uploads`

## Socket Events

- `connection`
- `disconnect`
- `join-chat`
- `typing-start`
- `typing-stop`
- `send-message`
- `new-message`
- `message-status-updated`
- `mark-chat-seen`
- `messages-seen`
- `react-message`
- `message-reaction-updated`
- `chat-notification`
- `call-user`
- `incoming-call`
- `answer-call`
- `call-answered`
- `ice-candidate`
- `end-call`

## Demo Flow

1. Sign up two different users.
2. Start a direct chat and send text messages.
3. Share an image or file.
4. Hold a key in the input to show typing.
5. Open the same app in a second browser window to test delivered and seen states.
6. Create a group and add/remove members as the group admin.
7. React to messages with emojis.
8. Record and send a voice note.
9. Start an audio or video call between two logged-in users.

