import { useState } from "react";

function GroupModal({ users, isOpen, onClose, onCreateGroup }) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  if (!isOpen) {
    return null;
  }

  const handleToggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim() || selectedMembers.length < 2) {
      return;
    }

    onCreateGroup({
      name: name.trim(),
      memberIds: selectedMembers,
    });

    setName("");
    setSelectedMembers([]);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>Create Group Chat</h3>
            <p>Pick at least 2 people and give the group a name.</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            placeholder="Group name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="member-grid">
            {users.map((user) => (
              <label key={user._id} className="member-option">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(user._id)}
                  onChange={() => handleToggleMember(user._id)}
                />
                <span>{user.name}</span>
              </label>
            ))}
          </div>

          <button type="submit">Create Group</button>
        </form>
      </div>
    </div>
  );
}

export default GroupModal;

