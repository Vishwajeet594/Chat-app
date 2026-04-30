import { useState } from "react";

function MessageInput({ onSend, disabled }) {
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onSend(message);
    setMessage("");
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder={disabled ? "Select a user to start chatting" : "Type a message"}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>
        Send
      </button>
    </form>
  );
}

export default MessageInput;

