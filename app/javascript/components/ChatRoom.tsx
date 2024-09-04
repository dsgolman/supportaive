import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Howl } from 'howler';
import { subscribeToChatRoom, unsubscribeFromChatRoom } from '../services/pusherService';

const ChatRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const audioQueueRef = useRef<string[]>([]);
  const messagesRef = useRef<Set<string>>(new Set());
  const currentSoundRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Function to play and immediately pause audio to unlock playback
    const unlockAudioPlayback = () => {
      const dummyAudio = new Audio("https://d1d9-108-28-91-136.ngrok-free.app/rails/active_storage/disk/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdDVG9JYTJWNVNTSWhiV2czWjJrMU0yZHBhamt6YkdWbk1XWTVZbTluTTNJeWF6RTVjd1k2QmtWVU9oQmthWE53YjNOcGRHbHZia2tpUTJGMGRHRmphRzFsYm5RN0lHWnBiR1Z1WVcxbFBTSmhkV1JwYnk1M1pXSnRJanNnWm1sc1pXNWhiV1VxUFZWVVJpMDRKeWRoZFdScGJ5NTNaV0p0QmpzR1ZEb1JZMjl1ZEdWdWRGOTBlWEJsU1NJUVlYVmthVzh2ZUMxM1lYWUdPd1pVT2hGelpYSjJhV05sWDI1aGJXVTZDbXh2WTJGcyIsImV4cCI6IjIwMjQtMDctMjZUMTU6MDc6MDYuNDYxWiIsInB1ciI6ImJsb2Jfa2V5In19--77186f92c2bb1b6c161993d31e4df6f48962cf1c/audio.webm");
      dummyAudio.play().catch(error => console.error('Autoplay unlock error:', error));
    };

    const handleUserInteraction = () => {
      unlockAudioPlayback();
      document.body.removeEventListener('touchstart', handleUserInteraction);
      document.body.removeEventListener('click', handleUserInteraction);
    };

    document.body.addEventListener('touchstart', handleUserInteraction, false);
    document.body.addEventListener('click', handleUserInteraction, false);

    const handleMessageReceived = (data: any) => {
      console.log('Received message:', data);
      if (data.content_type === 'audio') {
        audioQueueRef.current.push(data.content);
        // appendDebugMessage(`Audio received: ${data.content}`);
        playAudio();
      } else if (data.content_type === 'text') {
        if (messagesRef.current.has(data.id)) {
          return; // Ignore duplicate messages
        }
        messagesRef.current.add(data.id);
        appendTextMessage(data.content);
      }
    };

    subscribeToChatRoom(id, handleMessageReceived);

    return () => {
      unsubscribeFromChatRoom(id);
      messagesRef.current.clear();
    };
  }, [id]);

  const appendTextMessage = (message: string) => {
    const chat = document.querySelector<HTMLDivElement>("div#chat");
    if (chat) {
      const textNode = document.createElement('div');
      textNode.textContent = message;
      chat.appendChild(textNode);
      chat.scrollTop = chat.scrollHeight;
    }
  };

  const appendDebugMessage = (message: string) => {
    const chat = document.querySelector<HTMLDivElement>("div#chat");
    if (chat) {
      const debugNode = document.createElement('div');
      debugNode.style.color = 'red';
      debugNode.textContent = `DEBUG: ${message}`;
      chat.appendChild(debugNode);
      chat.scrollTop = chat.scrollHeight;
    }
  };

  const playAudio = () => {
    if (audioQueueRef.current.length === 0) return;

    // Stop any currently playing sound
    if (currentSoundRef.current) {
      currentSoundRef.current.stop();
    }

    const audioUrl = audioQueueRef.current.shift();
    if (audioUrl) {
      const sound = new Howl({
        src: [audioUrl],
        html5: true,
        onplayerror: () => {
          appendDebugMessage('Error playing audio.');
          console.error('Error playing audio');
          if (audioQueueRef.current.length > 0) {
            playAudio();
          }
        },
        onend: () => {
          appendDebugMessage('Audio playback ended.');
          if (audioQueueRef.current.length > 0) {
            playAudio();
          }
        }
      });

      appendDebugMessage(`Playing audio`);
      currentSoundRef.current = sound;
      sound.play();
    }
  };

  return (
    <div>
      <h1>Chat Room {id}</h1>
      <div id="chat" />
    </div>
  );
};

export default ChatRoom;
