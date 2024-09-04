import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatRoomList from './ChatRoomList';
import ChatRoom from './ChatRoom';
import CreateChatRoom from './CreateChatRoom';
import AudioChatComponent from './AudioChatComponent';
import ChatRoomContainer from './ChatRoomContainer';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatRoomList />} />
        <Route path="/chat_rooms/:id/audio" element={<AudioChatComponent />} />
        <Route path="/chat_rooms/:id" element={<ChatRoomContainer />} />
        <Route path="/create_chat_room" element={<CreateChatRoom />} />
      </Routes>
    </Router>
  );
};

export default App;
