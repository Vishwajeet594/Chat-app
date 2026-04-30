# Real-Time Chat Application (MERN + Socket.io)

This is a simple real-time chat application built with the MERN stack and Socket.io. It is designed like a practical student project: clean structure, clear APIs, easy-to-follow code, and enough real-time logic to discuss confidently in an interview.

## Features

- User registration and login with JWT authentication
- Password hashing with `bcryptjs`
- One-to-one real-time messaging using Socket.io
- Online and offline presence tracking
- Messages stored in MongoDB
- Chat history loading from the database
- Conversation list with last message and unread count
- Protected backend routes

## Tech Stack

- React
- Vite
- Node.js
- Express
- MongoDB
- Mongoose
- Socket.io
- JWT
- bcryptjs
- Axios

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

### 1. Clone or open the project

Use this workspace as-is.

### 2. Backend setup

```bash
cd server
npm install
```

Create a `.env` file in `server/` using `server/.env.example`.

Example:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mern_chat_app
JWT_SECRET=replace_with_a_long_secret_key
CLIENT_URL=http://localhost:5173
```

### 3. Frontend setup

```bash
cd client
npm install
```

Create a `.env` file in `client/` using `client/.env.example`.

Example:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run the backend

```bash
cd server
npm run dev
```

### 5. Run the frontend

```bash
cd client
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5000`.

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Users

- `GET /api/users`

### Chats and Messages

- `GET /api/chats/:userId`
- `GET /api/messages/:user1/:user2`
- `GET /api/messages/conversations/list`
- `POST /api/messages`
- `PATCH /api/messages/read/:userId`

## Sample Request Examples

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Rahul",
  "email": "rahul@example.com",
  "password": "123456"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "rahul@example.com",
  "password": "123456"
}
```

### Send Message

```http
POST /api/messages
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "receiverId": "665f31edb7d9fe000ab12345",
  "message": "Hello there"
}
```

### Get Chat History

```http
GET /api/chats/665f31edb7d9fe000ab12345
Authorization: Bearer YOUR_JWT_TOKEN
```

## Socket Flow

The app connects to Socket.io after login using the JWT token.

Main events used:

- `connection`
- `disconnect`
- `user-online`
- `user-offline`
- `online-users`
- `send-message`
- `receive-message`
- `mark-as-read`
- `messages-read`

## Interview Talking Points

- How JWT protects private routes
- Why Socket.io is used for instant messaging
- How presence is tracked using connection and disconnection events
- Why message history is still fetched from MongoDB even with real-time sockets
- How the conversation list is built from stored messages

## Notes

- This project keeps the structure modular, but intentionally avoids heavy abstraction.
- The UI is simple and functional so the focus stays on authentication, APIs, sockets, and persistence.
