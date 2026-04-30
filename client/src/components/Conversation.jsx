function Conversation({ selectedUser, messages, currentUserId, onlineUsers }) {
  if (!selectedUser) {
    return (
      <section className="chat-placeholder">
        <h2>Select a user</h2>
        <p>Choose someone from the left side to start chatting.</p>
      </section>
    );
  }

  const isOnline = onlineUsers.includes(selectedUser._id) || selectedUser.isOnline;

  return (
    <section className="chat-window">
      <div className="chat-header">
        <div>
          <h2>{selectedUser.name}</h2>
          <p>{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <p className="empty-state">No messages yet. Say hello.</p>
        ) : (
          messages.map((item) => (
            <div
              key={item._id}
              className={`message-bubble ${
                item.senderId === currentUserId ? "sent" : "received"
              }`}
            >
              <p>{item.message}</p>
              <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Conversation;

