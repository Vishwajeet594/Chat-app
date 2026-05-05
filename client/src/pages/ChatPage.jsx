import { useEffect, useRef, useState } from "react";
import api, { setAuthToken } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ChatSidebar from "../components/ChatSidebar";
import Conversation from "../components/Conversation";
import MessageInput from "../components/MessageInput";
import GroupModal from "../components/GroupModal";
import CallPanel from "../components/CallPanel";

const peerConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function ChatPage() {
  const { user, token, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingByChat, setTypingByChat] = useState({});
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [sidebarError, setSidebarError] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("chat-theme") !== "light"
  );
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const hasAutoStartedChatRef = useRef(false);

  const syncSelectedChat = (nextChats) => {
    setSelectedChat((currentSelectedChat) => {
      if (!nextChats.length) {
        return null;
      }

      if (!currentSelectedChat?._id) {
        return nextChats[0];
      }

      const matchingChat = nextChats.find((chat) => chat._id === currentSelectedChat._id);
      return matchingChat ? currentSelectedChat : nextChats[0];
    });
  };

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chat-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", !isDarkMode);

    return () => {
      document.documentElement.classList.remove("light-mode");
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [activeCall, incomingCall]);

  const loadSidebarData = async () => {
    try {
      const [usersResponse, chatsResponse] = await Promise.all([
        api.get("/users"),
        api.get("/chats"),
      ]);

      setUsers(usersResponse.data);
      setChats(chatsResponse.data);
      syncSelectedChat(chatsResponse.data);
      setSidebarError("");
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        return;
      }

      setSidebarError("Unable to load users right now.");
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    if (selectedChat || chats.length > 0 || users.length === 0 || sidebarError) {
      hasAutoStartedChatRef.current = false;
      return;
    }

    if (hasAutoStartedChatRef.current) {
      return;
    }

    hasAutoStartedChatRef.current = true;
    handleStartDirectChat(users[0]._id);
  }, [selectedChat, chats.length, users, sidebarError]);

  useEffect(() => {
    const refreshOnFocus = () => {
      loadSidebarData();
    };

    const intervalId = setInterval(() => {
      loadSidebarData();
    }, 6000);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [logout]);

  useEffect(() => {
    const selectedChatId = selectedChat?._id;

    if (!selectedChatId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);

      try {
        socket?.emit("join-chat", { chatId: selectedChatId });
        const { data } = await api.get(`/messages/chat/${selectedChatId}`);
        setMessages(data);
        await api.patch(`/messages/read/${selectedChatId}`);
        socket?.emit("mark-chat-seen", { chatId: selectedChatId });
      } catch (error) {
        console.error("Failed to load messages");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChat?._id, socket]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNewMessage = (incomingMessage) => {
      if (selectedChat && incomingMessage.chatId === selectedChat._id) {
        setMessages((prev) => {
          if (prev.some((message) => message._id === incomingMessage._id)) {
            return prev;
          }

          return [...prev, incomingMessage];
        });
      }

      if (
        incomingMessage.senderId !== user._id &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("New message", {
          body: incomingMessage.message || "You received a new attachment.",
        });
      }

      refreshChats();
    };

    const handleTypingStart = ({ chatId, userId }) => {
      if (userId === user._id) {
        return;
      }

      const name = users.find((item) => item._id === userId)?.name;
      if (!name) {
        return;
      }

      setTypingByChat((prev) => ({
        ...prev,
        [chatId]: Array.from(new Set([...(prev[chatId] || []), name])),
      }));
    };

    const handleTypingStop = ({ chatId, userId }) => {
      const name = users.find((item) => item._id === userId)?.name;
      if (!name) {
        return;
      }

      setTypingByChat((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter((item) => item !== name),
      }));
    };

    const handleMessagesSeen = ({ chatId, messageIds }) => {
      if (!selectedChat || chatId !== selectedChat._id) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          messageIds.includes(message._id)
            ? {
                ...message,
                status: "seen",
              }
            : message
        )
      );
      refreshChats();
    };

    const handleMessageStatusUpdated = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId
            ? {
                ...message,
                status,
              }
            : message
        )
      );
      refreshChats();
    };

    const handleReactionUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((message) => (message._id === updatedMessage._id ? updatedMessage : message))
      );
    };

    const handleIncomingCall = ({ fromUserId, offer, callType, chatId }) => {
      const fromName = users.find((item) => item._id === fromUserId)?.name;
      setCallStatus(`Incoming ${callType} call`);
      setIncomingCall({ fromUserId, fromName, offer, callType, chatId });
    };

    const handleCallAnswered = async ({ fromUserId, answer, callType, chatId }) => {
      if (!peerConnectionRef.current) {
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(answer);
      await flushPendingIceCandidates();
      setCallStatus(`${callType === "video" ? "Video" : "Audio"} call connected`);
      setActiveCall({ toUserId: fromUserId, callType, chatId });
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate || !peerConnectionRef.current) {
        return;
      }

      const remoteDescription = peerConnectionRef.current.remoteDescription;

      if (!remoteDescription?.type) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate");
      }
    };

    const handleCallEnded = () => {
      endCall(false);
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing-start", handleTypingStart);
    socket.on("typing-stop", handleTypingStop);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-status-updated", handleMessageStatusUpdated);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("chat-notification", refreshChats);
    socket.on("chat-updated", refreshChats);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing-start", handleTypingStart);
      socket.off("typing-stop", handleTypingStop);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-status-updated", handleMessageStatusUpdated);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("chat-notification", refreshChats);
      socket.off("chat-updated", refreshChats);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
    };
  }, [socket, selectedChat, user, users]);

  const refreshChats = async () => {
    try {
      const { data } = await api.get("/chats");
      setChats(data);
      syncSelectedChat(data);
    } catch (error) {
      console.error("Failed to refresh chats");
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleStartDirectChat = async (userId) => {
    try {
      const { data } = await api.post("/chats/direct", { userId });
      await refreshChats();
      setSelectedChat(data);
    } catch (error) {
      console.error("Failed to start direct chat");
    }
  };

  const handleCreateGroup = async (payload) => {
    try {
      const { data } = await api.post("/chats/group", payload);
      setIsGroupModalOpen(false);
      await refreshChats();
      setSelectedChat(data);
    } catch (error) {
      console.error("Failed to create group");
    }
  };

  const handleAddMembers = async (memberIds) => {
    if (!selectedChat) {
      return;
    }

    try {
      const { data } = await api.patch(`/chats/${selectedChat._id}/members`, { memberIds });
      setSelectedChat(data);
      refreshChats();
    } catch (error) {
      console.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedChat) {
      return;
    }

    try {
      const { data } = await api.delete(`/chats/${selectedChat._id}/members/${memberId}`);
      setSelectedChat(data);
      refreshChats();
    } catch (error) {
      console.error("Failed to remove member");
    }
  };

  const handleSendText = (messageText) => {
    if (!selectedChat || !socket) {
      return;
    }

    const participants = selectedChat.participants || [];

    socket.emit("send-message", {
      chatId: selectedChat._id,
      message: messageText,
      messageType: "text",
      receiverId: selectedChat.isGroupChat
        ? null
        : participants.find((participant) => participant._id !== user._id)?._id,
    });
  };

  const uploadAndSend = async (file) => {
    if (!selectedChat || !socket) {
      return;
    }

    const participants = selectedChat.participants || [];

    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post("/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    socket.emit("send-message", {
      chatId: selectedChat._id,
      message: "",
      messageType: data.messageType,
      attachments: [data],
      receiverId: selectedChat.isGroupChat
        ? null
        : participants.find((participant) => participant._id !== user._id)?._id,
    });
  };

  const handleVoiceNote = async (audioBlob) => {
    const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
      type: "audio/webm",
    });
    await uploadAndSend(file);
  };

  const handleReact = (messageId, emoji) => {
    socket?.emit("react-message", {
      messageId,
      emoji,
    });
  };

  const handleTypingStart = () => {
    if (selectedChat) {
      socket?.emit("typing-start", { chatId: selectedChat._id });
    }
  };

  const handleTypingStop = () => {
    if (selectedChat) {
      socket?.emit("typing-stop", { chatId: selectedChat._id });
    }
  };

  const flushPendingIceCandidates = async () => {
    if (!peerConnectionRef.current || pendingIceCandidatesRef.current.length === 0) {
      return;
    }

    const queuedCandidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to apply queued ICE candidate");
      }
    }
  };

  const setupPeerConnection = async (targetUserId, callType, chatId) => {
    peerConnectionRef.current?.close();
    pendingIceCandidatesRef.current = [];

    const peerConnection = new RTCPeerConnection(peerConfig);
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice-candidate", {
          toUserId: targetUserId,
          candidate: event.candidate,
          chatId,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === "connected") {
        setCallStatus(`${callType === "video" ? "Video" : "Audio"} call connected`);
      }

      if (state === "failed" || state === "disconnected" || state === "closed") {
        endCall(false);
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const getCallTarget = () =>
    (selectedChat?.participants || []).find((participant) => participant._id !== user._id);

  const startCall = async (callType) => {
    const targetUser = getCallTarget();

    if (!selectedChat) {
      setCallStatus("Open a direct chat first");
      return;
    }

    if (selectedChat.isGroupChat) {
      setCallStatus("Video and audio calls work only in direct chats");
      return;
    }

    if (!targetUser) {
      setCallStatus("The other user is not available in this chat");
      return;
    }

    if (!socket?.connected) {
      setCallStatus("Socket connection is not ready yet");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = await setupPeerConnection(
        targetUser._id,
        callType,
        selectedChat._id
      );
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket?.emit("call-user", {
        toUserId: targetUser._id,
        offer,
        callType,
        chatId: selectedChat._id,
      });

      setCallStatus(`${callType === "video" ? "Video" : "Audio"} call ringing...`);
      setActiveCall({
        toUserId: targetUser._id,
        callType,
        chatId: selectedChat._id,
      });
    } catch (error) {
      setCallStatus(`Unable to access ${callType} devices`);
      console.error("Failed to start call", error);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === "video",
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = await setupPeerConnection(
        incomingCall.fromUserId,
        incomingCall.callType,
        incomingCall.chatId
      );

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(incomingCall.offer);
      await flushPendingIceCandidates();
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket?.emit("answer-call", {
        toUserId: incomingCall.fromUserId,
        answer,
        callType: incomingCall.callType,
        chatId: incomingCall.chatId,
      });

      setCallStatus(
        `${incomingCall.callType === "video" ? "Video" : "Audio"} call connecting...`
      );
      setActiveCall({
        toUserId: incomingCall.fromUserId,
        callType: incomingCall.callType,
        chatId: incomingCall.chatId,
      });
      setIncomingCall(null);
    } catch (error) {
      setCallStatus("Unable to access camera or microphone");
      console.error("Failed to accept call", error);
    }
  };

  const endCall = (notifyPeer = true) => {
    if (notifyPeer && activeCall?.toUserId) {
      socket?.emit("end-call", {
        toUserId: activeCall.toUserId,
        chatId: activeCall.chatId,
      });
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus("");
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    });
  };

  const declineCall = () => {
    if (incomingCall) {
      socket?.emit("end-call", {
        toUserId: incomingCall.fromUserId,
        chatId: incomingCall.chatId,
      });
    }
    setIncomingCall(null);
  };

  const availableMembers = selectedChat?.isGroupChat
    ? users.filter(
        (person) =>
          !(selectedChat.participants || []).some((participant) => participant._id === person._id)
      )
    : [];

  return (
    <div className={`chat-page ${isDarkMode ? "" : "light-mode"}`}>
      <div className="page-orb page-orb-one" />
      <div className="page-orb page-orb-two" />
      <div className="page-orb page-orb-three" />
      <header className="topbar">
        <div>
          <h1>MERN Chat App</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsDarkMode((prev) => !prev)}
          >
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <CallPanel
        incomingCall={incomingCall}
        activeCall={activeCall}
        callStatus={callStatus}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />

      <main className="chat-layout">
        <ChatSidebar
          chats={chats}
          users={users}
          sidebarError={sidebarError}
          selectedChat={selectedChat}
          currentUserId={user._id}
          onlineUsers={onlineUsers}
          onSelectChat={handleSelectChat}
          onStartDirectChat={handleStartDirectChat}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
        />

        <div className="chat-main">
          <Conversation
            selectedChat={selectedChat}
            messages={messages}
            currentUserId={user._id}
            onlineUsers={onlineUsers}
            typingUsers={selectedChat ? typingByChat[selectedChat._id] || [] : []}
            isLoadingMessages={isLoadingMessages}
            onReact={handleReact}
            onStartAudioCall={() => startCall("audio")}
            onStartVideoCall={() => startCall("video")}
            onAddMembers={handleAddMembers}
            onRemoveMember={handleRemoveMember}
            availableMembers={availableMembers}
          />
          <MessageInput
            onSend={handleSendText}
            onFileUpload={uploadAndSend}
            onVoiceNote={handleVoiceNote}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            disabled={!selectedChat}
          />
        </div>
      </main>

      <GroupModal
        users={users}
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}

export default ChatPage;
