function getChatTitle(chat, currentUserId) {
  if (chat.isGroupChat) {
    return chat.name;
  }

  return (
    (chat.participants || []).find((participant) => participant._id !== currentUserId)?.name ||
    "Direct Chat"
  );
}

function ChatSidebar({
  chats,
  users,
  sidebarError,
  selectedChat,
  currentUserId,
  onlineUsers,
  onSelectChat,
  onStartDirectChat,
  onOpenGroupModal,
}) {
  const onlineCount = users.filter((user) => onlineUsers.includes(user._id) || user.isOnline).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-glow sidebar-glow-one" />
      <div className="sidebar-glow sidebar-glow-two" />
      <div className="sidebar-header">
        <div>
          <span className="section-kicker">Workspace</span>
          <h2>Conversations</h2>
          <p>Stay close to every thread with a cleaner, more focused message workspace.</p>
        </div>
      </div>

      <div className="sidebar-toolbar">
        <div className="sidebar-stat">
          <strong>{chats.length}</strong>
          <span>Active chats</span>
        </div>
        <div className="sidebar-stat">
          <strong>{onlineCount}</strong>
          <span>Online now</span>
        </div>
        <button type="button" className="secondary-button sidebar-cta" onClick={onOpenGroupModal}>
          New Group
        </button>
      </div>

      <div className="sidebar-section">
        <h3>Recent Chats</h3>
        <div className="chat-list">
          {chats.length === 0 ? (
            <p className="empty-sidebar">No chats yet. Start with a user below.</p>
          ) : (
            chats.map((chat) => {
              const participants = chat.participants || [];
              const title = getChatTitle(chat, currentUserId);
              const lastMessage =
                chat.latestMessage?.message ||
                chat.latestMessage?.attachments?.[0]?.originalName ||
                "No messages yet";

              return (
                <button
                  key={chat._id}
                  className={`chat-card ${selectedChat?._id === chat._id ? "active" : ""}`}
                  onClick={() => onSelectChat(chat)}
                >
                  <div className="chat-card-main">
                    <div className="chat-card-top">
                      <strong>{title}</strong>
                      {chat.isGroupChat ? (
                        <span className="group-pill">{participants.length} members</span>
                      ) : (
                        <span
                          className={`status-dot ${
                            participants.some(
                              (participant) =>
                                participant._id !== currentUserId &&
                                onlineUsers.includes(participant._id)
                            )
                              ? "online"
                              : "offline"
                          }`}
                        />
                      )}
                    </div>
                    <div className="chat-card-meta">
                      <span>{chat.isGroupChat ? "Group room" : "Direct message"}</span>
                      <span>
                        {chat.latestMessage?.createdAt
                          ? new Date(chat.latestMessage.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "Fresh chat"}
                      </span>
                    </div>
                    <p className="last-message">{lastMessage}</p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge">{chat.unreadCount}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Start Direct Chat</h3>
        <div className="user-list">
          {sidebarError ? <p className="empty-sidebar">{sidebarError}</p> : null}
          {!sidebarError && users.length === 0 ? (
            <p className="empty-sidebar">
              No other users yet. Create a second account in another browser window to start chatting.
            </p>
          ) : null}
          {users.map((user) => (
            <button
              key={user._id}
              className="user-card"
              onClick={() => onStartDirectChat(user._id)}
            >
              <div>
                <div className="user-card-top">
                  <span className="user-name">{user.name}</span>
                  <span
                    className={`status-dot ${
                      onlineUsers.includes(user._id) || user.isOnline ? "online" : "offline"
                    }`}
                  />
                </div>
                <div className="chat-card-meta">
                  <span>{onlineUsers.includes(user._id) || user.isOnline ? "Live now" : "Offline"}</span>
                  <span>Direct chat</span>
                </div>
                <p className="user-meta">
                  {onlineUsers.includes(user._id) || user.isOnline
                    ? "Available now"
                    : "Tap to start chat"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default ChatSidebar;
