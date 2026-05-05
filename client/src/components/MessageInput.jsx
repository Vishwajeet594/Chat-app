import { useEffect, useRef, useState } from "react";

const quickEmojis = ["\u{1F600}", "\u{1F525}", "\u2764\uFE0F", "\u{1F44F}"];

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
      <path
        d="M3 11.9 20.2 4.4c.8-.3 1.5.4 1.2 1.2L13.9 22.8c-.3.8-1.4.8-1.7 0l-2.1-5.6-5.6-2.1c-.8-.3-.8-1.4 0-1.7l6.4-2.4"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
      <path
        d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V7.5a3.5 3.5 0 1 0-7 0V12a3.5 3.5 0 0 0 3.5 3.5Z"
        fill="currentColor"
      />
      <path
        d="M6.5 11.8a5.5 5.5 0 0 0 11 0M12 17.3V21M9.3 21h5.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="input-icon">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8.6 13.8c.8 1.4 2 2.2 3.4 2.2s2.6-.8 3.4-2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessageInput({
  onSend,
  onFileUpload,
  onVoiceNote,
  onTypingStart,
  onTypingStop,
  disabled,
}) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 132);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, [message]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onSend(message.trim());
    setMessage("");
    setIsEmojiOpen(false);
    onTypingStop();
  };

  const handleChange = (event) => {
    setMessage(event.target.value);
    onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 1200);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await onFileUpload(file);
    event.target.value = "";
  };

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      await onVoiceNote(audioBlob);
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const handleEmojiPick = (emoji) => {
    setMessage((prev) => `${prev}${emoji}`);
    setIsEmojiOpen(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="composer-shell">
      {isEmojiOpen ? (
        <div className="emoji-popover">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-chip"
              onClick={() => handleEmojiPick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="composer-hint-row">
        <span className="composer-hint">Press Enter to send</span>
        <span className="composer-hint">Shift + Enter for a new line</span>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="icon-button subtle-button"
          onClick={() => setIsEmojiOpen((prev) => !prev)}
          disabled={disabled}
          aria-label="Open emoji picker"
        >
          <SmileIcon />
        </button>

        <label className="icon-button subtle-button" aria-label="Upload file">
          <PlusIcon />
          <input type="file" hidden onChange={handleFileChange} disabled={disabled} />
        </label>

        <div className="message-input-wrap">
          <textarea
            ref={textareaRef}
            placeholder={disabled ? "Select a chat to start messaging" : "Write a message..."}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Message input"
            rows={1}
          />
        </div>

        <button
          type="button"
          className={`icon-button subtle-button ${isRecording ? "recording" : ""}`}
          onClick={handleRecord}
          disabled={disabled}
          aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
        >
          <MicIcon />
        </button>

        <button type="submit" disabled={disabled} aria-label="Send message" className="send-button">
          <PlaneIcon />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
