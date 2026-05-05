function CallPanel({
  incomingCall,
  activeCall,
  callStatus,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isCameraOff,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) {
  return (
    <>
      {callStatus && !incomingCall && !activeCall ? (
        <div className="call-banner">
          <div>
            <strong>Call status</strong>
            <p>{callStatus}</p>
          </div>
        </div>
      ) : null}

      {incomingCall ? (
        <div className="call-banner">
          <div>
            <strong>Incoming {incomingCall.callType} call</strong>
            <p>{incomingCall.fromName || "Another user"} is calling you.</p>
          </div>
          <div className="call-actions">
            <button type="button" onClick={onAccept}>
              Accept
            </button>
            <button type="button" className="secondary-button" onClick={onDecline}>
              Decline
            </button>
          </div>
        </div>
      ) : null}

      {activeCall ? (
        <div className="call-panel">
          <div className="call-panel-header">
            <div>
              <strong>{activeCall.callType === "video" ? "Video call" : "Audio call"}</strong>
              <p>{callStatus || "Connecting..."}</p>
            </div>
          </div>
          <div className="call-videos">
            {activeCall.callType === "video" ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="call-video call-video-main"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="call-video call-video-preview"
                />
              </>
            ) : (
              <div className="audio-call-stage">
                <div className="audio-call-avatar">Voice</div>
                <video ref={localVideoRef} autoPlay muted playsInline className="hidden-video" />
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden-video" />
              </div>
            )}
          </div>

          <div className="call-toolbar">
            <button type="button" className="secondary-button" onClick={onToggleMute}>
              {isMuted ? "Unmute" : "Mute"}
            </button>
            {activeCall.callType === "video" ? (
              <button type="button" className="secondary-button" onClick={onToggleCamera}>
                {isCameraOff ? "Camera On" : "Camera Off"}
              </button>
            ) : null}
            <button type="button" onClick={onEnd}>
              End Call
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default CallPanel;
