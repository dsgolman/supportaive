import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
// import ChatRoom from './ChatRoom';
import AgoraAppBuilder from "@appbuilder/react";

const ChatRoomContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [joined, setJoined] = useState(false);

  const handleJoinChat = () => {
    setJoined(true);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh' // Full viewport height
    }}>
      {joined ? (
        <ChatRoom />
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%' // Full width
        }}>
          <button style={{
            padding: '10px 20px',
            fontSize: '16px'
          }} onClick={handleJoinChat}>
            Join Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatRoomContainer;
