function UserList({ users, selectedUser, onSelectUser, onlineUsers, conversations }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Chats</h2>
      </div>

      <div className="user-list">
        {users.map((user) => {
          const conversation = conversations.find((item) => item.user._id === user._id);
          const isOnline = onlineUsers.includes(user._id) || user.isOnline;

          return (
            <button
              key={user._id}
              className={`user-card ${selectedUser?._id === user._id ? "active" : ""}`}
              onClick={() => onSelectUser(user)}
            >
              <div>
                <div className="user-card-top">
                  <span className="user-name">{user.name}</span>
                  <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
                </div>
                <p className="user-meta">{isOnline ? "Online" : "Offline"}</p>
                <p className="last-message">
                  {conversation?.lastMessage || "Start a new conversation"}
                </p>
              </div>
              {conversation?.unreadCount > 0 && (
                <span className="unread-badge">{conversation.unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default UserList;

