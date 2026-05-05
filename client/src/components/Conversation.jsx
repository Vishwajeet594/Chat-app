import { useEffect, useMemo, useRef, useState } from "react";

const reactionOptions = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F525}"];

function renderAttachments(message) {
  if (!message.attachments?.length) {
    return null;
  }

  return (
    <div className="attachment-list">
      {message.attachments.map((attachment) => {
        if (attachment.resourceType === "image") {
          return (
            <img
              key={attachment.publicId || attachment.url}
              src={attachment.url}
              alt={attachment.originalName || "attachment"}
              className="chat-image"
            />
          );
        }

        if (message.messageType === "audio" || attachment.resourceType === "video") {
          return (
            <audio
              key={attachment.publicId || attachment.url}
              src={attachment.url}
              controls
              className="audio-player"
            />
          );
        }

        return (
          <a
            key={attachment.publicId || attachment.url}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="file-link"
          >
            {attachment.originalName || "Open file"}
          </a>
        );
      })}
    </div>
  );
}

function getChatTitle(chat, currentUserId) {
  if (chat.isGroupChat) {
    return chat.name;
  }

  return (
    chat.participants.find((participant) => participant._id !== currentUserId)?.name ||
    "Direct Chat"
  );
}

function getStatusLabel(status) {
  if (status === "seen") {
    return "Seen";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  return "Sent";
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Conversation({
  selectedChat,
  messages,
  currentUserId,
  onlineUsers,
  typingUsers,
  isLoadingMessages,
  onReact,
  onStartAudioCall,
  onStartVideoCall,
  onAddMembers,
  onRemoveMember,
  availableMembers,
}) {
  const [memberToAdd, setMemberToAdd] = useState("");
  const messageListRef = useRef(null);
  const previousChatIdRef = useRef(null);
  const participants = selectedChat?.participants || [];
  const admins = selectedChat?.admins || [];
  const groupedMessages = useMemo(
    () =>
      messages.map((item, index) => {
        const isMine = item.senderId === currentUserId;
        const previousMessage = messages[index - 1];
        const nextMessage = messages[index + 1];

        return {
          ...item,
          isMine,
          startsGroup: previousMessage?.senderId !== item.senderId,
          endsGroup: nextMessage?.senderId !== item.senderId,
          senderName: item.sender?.name || (isMine ? "You" : "User"),
        };
      }),
    [currentUserId, messages]
  );

  useEffect(() => {
    if (!selectedChat?._id) {
      return;
    }

    if (!memberToAdd || !availableMembers.some((member) => member._id === memberToAdd)) {
      setMemberToAdd(availableMembers[0]?._id || "");
    }
  }, [availableMembers, memberToAdd, selectedChat?._id]);

  useEffect(() => {
    if (!selectedChat?._id || !messageListRef.current || isLoadingMessages) {
      return;
    }

    const behavior = previousChatIdRef.current === selectedChat._id ? "smooth" : "auto";
    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior,
    });
    previousChatIdRef.current = selectedChat._id;
  }, [isLoadingMessages, messages.length, selectedChat?._id, typingUsers.length]);

  if (!selectedChat) {
    return (
      <section className="chat-placeholder premium-empty-state">
        <div className="empty-state-visual" />
        <h2>Select a conversation</h2>
        <p>Choose a person or group to start a smooth, real-time conversation.</p>
      </section>
    );
  }

  const isDirectChat = !selectedChat.isGroupChat;
  const otherParticipant = participants.find((participant) => participant._id !== currentUserId);
  const isOnline = otherParticipant
    ? onlineUsers.includes(otherParticipant._id) || otherParticipant.isOnline
    : false;
  const isAdmin = admins.some((admin) => admin._id === currentUserId);
  const statusText =
    typingUsers.length > 0
      ? `${typingUsers.join(", ")} ${typingUsers.length > 1 ? "are" : "is"} typing`
      : selectedChat.isGroupChat
        ? `${participants.length} participants`
        : isOnline
          ? "Online now"
          : "Offline";

  return (
    <section className="chat-window">
      <div className="chat-header sticky-chat-header">
        <div className="chat-header-copy">
          <span className="section-kicker">Current room</span>
          <h2>{getChatTitle(selectedChat, currentUserId)}</h2>
          <div className="chat-subline">
            {!selectedChat.isGroupChat ? (
              <span className={`chat-status-pill ${isOnline ? "online" : "offline"}`}>
                <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
                {statusText}
              </span>
            ) : (
              <span className="chat-status-pill group">{statusText}</span>
            )}
          </div>
        </div>

        {isDirectChat ? (
          <div className="call-actions conversation-actions">
            <button type="button" className="secondary-button" onClick={onStartAudioCall}>
              Audio
            </button>
            <button type="button" className="secondary-button" onClick={onStartVideoCall}>
              Video
            </button>
          </div>
        ) : null}
      </div>

      {selectedChat.isGroupChat ? (
        <div className="group-info-panel">
          <div className="group-members">
            {participants.map((participant) => (
              <span key={participant._id} className="member-chip">
                {participant.name}
                {isAdmin && participant._id !== currentUserId ? (
                  <button type="button" onClick={() => onRemoveMember(participant._id)}>
                    x
                  </button>
                ) : null}
              </span>
            ))}
          </div>

          {isAdmin && availableMembers.length > 0 ? (
            <div className="group-add-row">
              <select value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)}>
                {availableMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (memberToAdd) {
                    onAddMembers([memberToAdd]);
                  }
                }}
              >
                Add Member
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="messages" role="log" aria-live="polite" ref={messageListRef}>
        {isLoadingMessages ? (
          <div className="message-skeleton-list">
            <div className="message-skeleton received" />
            <div className="message-skeleton sent" />
            <div className="message-skeleton received large" />
          </div>
        ) : null}

        {!isLoadingMessages && messages.length === 0 ? (
          <div className="inline-empty-state">
            <div className="empty-state-visual small" />
            <p className="empty-state">No messages yet. Break the silence with a first message.</p>
          </div>
        ) : null}

        {!isLoadingMessages
          ? groupedMessages.map((item) => (
              <div
                key={item._id}
                className={`message-row ${item.isMine ? "mine" : "theirs"} ${
                  item.startsGroup ? "starts-group" : ""
                } ${item.endsGroup ? "ends-group" : ""}`}
              >
                {!item.isMine ? (
                  <div className={`message-avatar ${item.startsGroup ? "visible" : "hidden"}`}>
                    {item.startsGroup ? getInitials(item.senderName) : ""}
                  </div>
                ) : null}

                <div className="message-stack">
                  {selectedChat.isGroupChat && !item.isMine && item.startsGroup ? (
                    <strong className="message-author">{item.senderName}</strong>
                  ) : null}

                  <div className={`message-bubble ${item.isMine ? "sent" : "received"}`}>
                    {item.message ? <p>{item.message}</p> : null}
                    {renderAttachments(item)}

                    <div className="message-meta">
                      <span className="message-time" title={new Date(item.createdAt).toLocaleString()}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.isMine && !selectedChat.isGroupChat ? (
                        <span className={`status-label status-${item.status}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      ) : null}
                    </div>

                    <div className="reaction-row">
                      {(item.reactions || []).map((reaction) => (
                        <span
                          key={`${reaction.userId}-${reaction.emoji}`}
                          className="reaction-pill"
                        >
                          {reaction.emoji}
                        </span>
                      ))}

                      <div className="reaction-picker">
                        {reactionOptions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="ghost-button"
                            onClick={() => onReact(item._id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          : null}

        {typingUsers.length > 0 ? (
          <div className="typing-indicator premium-typing">
            <span className="typing-label">
              {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing
            </span>
            <span className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default Conversation;
