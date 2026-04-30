import { useEffect, useRef, useState } from "react";
import UserList from "../components/UserList";
import Conversation from "../components/Conversation";
import MessageInput from "../components/MessageInput";
import api, { setAuthToken } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

function ChatPage() {
  const { user, token, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersResponse, conversationsResponse] = await Promise.all([
          api.get("/users"),
          api.get("/messages/conversations/list"),
        ]);

        setUsers(usersResponse.data);
        setConversations(conversationsResponse.data);
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    loadInitialData();
  }, [logout]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    const loadMessages = async () => {
      try {
        const { data } = await api.get(`/chats/${selectedUser._id}`);
        setMessages(data);
        await api.patch(`/messages/read/${selectedUser._id}`);
        socket?.emit("mark-as-read", { userId: selectedUser._id });
      } catch (error) {
        console.error("Failed to load messages");
      }
    };

    loadMessages();
  }, [selectedUser, socket]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleReceiveMessage = (incomingMessage) => {
      const isCurrentChat =
        selectedUser &&
        ((incomingMessage.senderId === selectedUser._id && incomingMessage.receiverId === user._id) ||
          (incomingMessage.senderId === user._id && incomingMessage.receiverId === selectedUser._id));

      if (isCurrentChat) {
        setMessages((prev) => [...prev, incomingMessage]);
      }

      refreshConversationList();
    };

    const handleMessageSent = (sentMessage) => {
      if (selectedUser && sentMessage.receiverId === selectedUser._id) {
        setMessages((prev) => [...prev, sentMessage]);
      }

      refreshConversationList();
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("message-sent", handleMessageSent);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message-sent", handleMessageSent);
    };
  }, [socket, selectedUser, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshConversationList = async () => {
    try {
      const { data } = await api.get("/messages/conversations/list");
      setConversations(data);
    } catch (error) {
      console.error("Failed to refresh conversations");
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!selectedUser || !socket) {
      return;
    }

    socket.emit("send-message", {
      receiverId: selectedUser._id,
      message: messageText,
    });
  };

  const handleSelectUser = (chatUser) => {
    setSelectedUser(chatUser);
  };

  return (
    <div className="chat-page">
      <header className="topbar">
        <div>
          <h1>MERN Chat App</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </header>

      <main className="chat-layout">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          onlineUsers={onlineUsers}
          conversations={conversations}
        />

        <div className="chat-main">
          <Conversation
            selectedUser={selectedUser}
            messages={messages}
            currentUserId={user._id}
            onlineUsers={onlineUsers}
          />
          <div ref={bottomRef} />
          <MessageInput onSend={handleSendMessage} disabled={!selectedUser} />
        </div>
      </main>
    </div>
  );
}

export default ChatPage;

