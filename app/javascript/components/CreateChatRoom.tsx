import React, { useState } from 'react';
import axios from '../services/axiosInstance';

const CreateChatRoom: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    axios.post('/chat_rooms', { name })
      .then(response => {
        setSuccess(true);
        setName('');
      })
      .catch(error => {
        setError('Failed to create chat room');
        console.error('Error creating chat room:', error);
      });
  };

  return (
    <div>
      <h2>Create Chat Room</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <button type="submit">Create</button>
      </form>
      {error && <div>{error}</div>}
      {success && <div>Chat room created successfully!</div>}
    </div>
  );
};

export default CreateChatRoom;
