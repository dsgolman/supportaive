import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Hume,
  HumeClient,
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  MimeType,
} from 'hume';
import axios from '../services/axiosInstance';
import { handleToolCallMessage } from '../services/handleToolCall';
import { subscribeToChatRoom, unsubscribeFromChatRoom } from '../services/pusherService';

const AudioChatComponent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<HumeClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resumeChats, setResumeChats] = useState(true);
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [callStarted, setCallStarted] = useState(false);
  const [socket, setSocket] = useState<Hume.empathicVoice.chat.ChatSocket | null>(null);

  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  useEffect(() => {
    const initializeConnection = async () => {
      await connect();
    };

    initializeConnection();

    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (client) {
      const initializeChatSocket = async () => {
        try {
          const chatSocket = await client.empathicVoice.chat.connect({
            configId: "c8e7beca-b683-481c-a23e-dd7b4e07a7d4",
          });

          chatSocket.on("open", handleWebSocketOpenEvent);
          chatSocket.on("message", handleWebSocketMessageEvent);
          chatSocket.on("error", handleWebSocketErrorEvent);
          chatSocket.on("close", handleWebSocketCloseEvent);

          setSocket(chatSocket);
          console.log('Socket initialized:', chatSocket);
        } catch (error) {
          console.error('Error connecting to Hume chat socket:', error);
        }
      };

      initializeChatSocket();
    }
  }, [client]);

  useEffect(() => {
    if (chatGroupId) {
      subscribeToChatRoom(chatGroupId, handleMessageReceived);
    }
    return () => {
      if (chatGroupId) {
        unsubscribeFromChatRoom(chatGroupId);
      }
    };
  }, [chatGroupId]);

  const connect = async () => {
    try {
      const response = await axios.get(`/chat_rooms/${id}`);
      const chatRoomData = response.data;

      if (chatRoomData.chat_group_id) {
        setChatGroupId(chatRoomData.chat_group_id);
      } else {
        if (!client) {
          const humeClient = new HumeClient({
            apiKey: "OFMg1SxtmcuixOeof2dRUhfRGWCifWY7MfSpJ97h9txv2e2G",
            secretKey: "d74GmHknT9UY51FM3S6IfN7JfKWrqdyMCy6yxmRdCL1DAHo2hM2tYlCI7m4hCiJc",
          });
          setClient(humeClient);
        }
      }
    } catch (error) {
      console.error('Error connecting to chat room or Hume client:', error);
    }
  };

  const disconnect = async () => {
    if (socket) {
      socket.close();
    }
    if (recorder) {
      recorder.stop();
    }
    setConnected(false);
    if (!resumeChats) {
      setChatGroupId(undefined);
    }

    if (chatGroupId) {
      await unsubscribeFromChatRoom(chatGroupId);
    }
  };

  const captureAudio = async () => {
    const stream = await getAudioStream();
    ensureSingleValidAudioTrack(stream);

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    setRecorder(mediaRecorder);
    setAudioStream(stream);

    mediaRecorder.ondataavailable = async ({ data }) => {
      if (data.size < 1) return;
      const encodedAudioData = await convertBlobToBase64(data);
      const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
        data: encodedAudioData,
      };
      socket?.sendAudioInput(audioInput);
    };

    mediaRecorder.start(100);
  };

  const playAudio = () => {
    if (audioQueue.length === 0 || isPlaying) return;

    setIsPlaying(true);
    const audioUrl = audioQueue.shift();

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      audio.play();

      audio.onended = () => {
        setIsPlaying(false);
        if (audioQueue.length > 0) {
          playAudio();
        }
      };

      audio.onerror = () => {
        console.error('Error playing audio');
        setIsPlaying(false);
        if (audioQueue.length > 0) {
          playAudio();
        }
      };
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setAudioQueue([]);
  };

  const sendResumeAssistantMessage = async () => {
    try {
    	socket.url
      const message = {
        resumed_chat_group_id: chatGroupId, // Add any relevant content here if needed
      };
      if (socket) {
        console.log('Sending resume assistant message:', socket);
        socket.sendSessionSettings(message);
      } else {
        console.error('Socket is null. Cannot send resume assistant message.');
      }
    } catch (error) {
      console.error('Error sending resume_assistant_message:', error);
    }
  };

  const handleWebSocketOpenEvent = async () => {
    setConnected(true);
    console.log('WebSocket connection opened.');
    // Optionally, start capturing audio here if needed
    // await captureAudio();
  };

  const handleMessageReceived = (data: any) => {
    console.log('Message received:', data);
    const { content, content_type } = data;
    if (content_type === 'audio') {
      const audioUrl = `${content}`;
      setAudioQueue(prevQueue => [...prevQueue, audioUrl]);
    }
  };

  const handleWebSocketMessageEvent = async (message: Hume.empathicVoice.SubscribeEvent) => {
    console.log('WebSocket message event:', message);

    if (callStarted) {
      switch (message.type) {
        case "audio_output":
          const audioOutput = message.data as Hume.empathicVoice.AudioOutput;
          const audioUrl = audioOutput.data;
          setAudioQueue(prevQueue => [...prevQueue, audioUrl]);
          playAudio();
          break;
        case "user_message":
        case "assistant_message":
          const chatMessage = message.data as Hume.empathicVoice.UserMessage | Hume.empathicVoice.AssistantMessage;
          const topThreeEmotions = extractTopThreeEmotions(chatMessage);
          appendMessage(chatMessage.role, chatMessage.content, topThreeEmotions);
          break;
        default:
          console.log('Unhandled message type:', message.type);
          break;
      }
    } else {
    	setChatGroupId(message.chatGroupId);
    }
  };

  const handleWebSocketErrorEvent = (error: Error) => {
    console.error('WebSocket error:', error);
  };

  const handleWebSocketCloseEvent = async () => {
    if (connected) await connect();
    console.log('WebSocket connection closed');
  };

  const appendMessage = (role: Hume.empathicVoice.Role, content: string, topThreeEmotions: { emotion: string; score: any }[]) => {
    const chatCard = new ChatCard({
      role,
      timestamp: new Date().toLocaleTimeString(),
      content,
      scores: topThreeEmotions,
    });
    const chat = document.querySelector<HTMLDivElement>("div#chat");
    chat?.appendChild(chatCard.render());
    if (chat) chat.scrollTop = chat.scrollHeight;
  };

  const extractTopThreeEmotions = (message: Hume.empathicVoice.UserMessage | Hume.empathicVoice.AssistantMessage) => {
    const scores = message.models.prosody?.scores;
    const scoresArray = Object.entries(scores || {});
    scoresArray.sort((a, b) => b[1] - a[1]);
    const topThreeEmotions = scoresArray.slice(0, 3).map(([emotion, score]) => ({
      emotion,
      score: (Math.round(Number(score) * 100) / 100).toFixed(2),
    }));
    return topThreeEmotions;
  };

  const handleStartCall = async () => {
    console.log('Starting call with socket:', socket);
    if (chatGroupId) {
      const newChatSocket = await client.empathicVoice.chat.connect({
	      configId: "c8e7beca-b683-481c-a23e-dd7b4e07a7d4",
	      resumed_chat_group_id: chatGroupId
	    });
      setSocket(newChatSocket);
      setCallStarted(true);
    } else {
      console.error('Socket is null when starting call.');
    }
  };

  return (
    <div id="app">
      <div id="btn-container">
        <button id="start-btn" onClick={handleStartCall} disabled={!connected}>Start</button>
        <button id="stop-btn" onClick={stopAudio} disabled={!connected}>Stop</button>
      </div>
      <div id="heading-container">
        <h2>Empathic Voice Interface (EVI)</h2>
        <p>
          Welcome to our TypeScript sample implementation of the Empathic Voice Interface!
          Click the "Start" button and begin talking to interact with EVI.
        </p>
      </div>
      <div id="chat"></div>
    </div>
  );
};

interface Score {
  emotion: string;
  score: string;
}

interface ChatMessage {
  role: Hume.empathicVoice.Role;
  timestamp: string;
  content: string;
  scores: Score[];
}

class ChatCard {
  private message: ChatMessage;

  constructor(message: ChatMessage) {
    this.message = message;
  }

  private createScoreItem(score: Score): HTMLElement {
    const scoreItem = document.createElement('div');
    scoreItem.className = 'score-item';
    scoreItem.innerHTML = `${score.emotion}: <strong>${score.score}</strong>`;
    return scoreItem;
  }

  public render(): HTMLElement {
    const card = document.createElement('div');
    card.className = `chat-card ${this.message.role}`;

    const role = document.createElement('div');
    role.className = 'role';
    role.textContent =
      this.message.role.charAt(0).toUpperCase() + this.message.role.slice(1);

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.innerHTML = `<strong>${this.message.timestamp}</strong>`;

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = this.message.content;

    const scores = document.createElement('div');
    scores.className = 'scores';
    this.message.scores.forEach((score) => {
      scores.appendChild(this.createScoreItem(score));
    });

    card.appendChild(role);
    card.appendChild(timestamp);
    card.appendChild(content);
    card.appendChild(scores);

    return card;
  }
}

export default AudioChatComponent;
