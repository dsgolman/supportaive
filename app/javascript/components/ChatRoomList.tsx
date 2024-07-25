import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../services/axiosInstance';

interface ChatRoom {
  id: number;
  name: string;
}

const ChatRoomList: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/chat_rooms')
      .then(response => {
        setChatRooms(response.data);
      })
      .catch(error => {
        setError('Failed to fetch chat rooms');
        console.error('Error fetching chat rooms:', error);
      });
  }, []);

  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Chat Rooms</h1>
      <ul>
        {chatRooms.map((chatRoom: ChatRoom) => (
          <li key={chatRoom.id}>
            <Link to={`/chat_rooms/${chatRoom.id}`}>
              {chatRoom.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatRoomList;
