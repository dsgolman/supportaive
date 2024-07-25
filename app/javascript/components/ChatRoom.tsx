import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../services/axiosInstance';
import { subscribeToChatRoom, unsubscribeFromChatRoom } from '../services/pusherService';

const ChatRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');

  useEffect(() => {
    fetchMessages();

    const handleMessageReceived = (data: any) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    };

    subscribeToChatRoom(id, handleMessageReceived);

    return () => {
      unsubscribeFromChatRoom(id);
    };
  }, [id]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/chat_rooms/${id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('There was an error fetching the messages!', error);
    }
  };

  const checkIfFacilitator = async (chatRoomId: string) => {
    try {
      const response = await axios.get(`/chat_rooms/${chatRoomId}/facilitator`);
      return response.data.id; // Adjust based on API response structure
    } catch (error) {
      console.error('Error checking facilitator status:', error);
      return false;
    }
  }

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post(`/chat_rooms/${id}/messages`, {
        content: newMessage,
        user_id: 1, // Assuming user_id is 1 for demonstration; update as needed
        chat_room_id: id
      });
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('There was an error sending the message!', error);
    }
  };

  return (
    <div>
      <h1>Chat Room {id}</h1>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message.content}</li>
        ))}
      </ul>
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="New Message"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatRoom;
