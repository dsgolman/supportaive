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
import { ChatCard } from './ChatCard';  // Assuming ChatCard.tsx is in the same directory

const AudioChatComponent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<HumeClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [resumeChats, setResumeChats] = useState(true);
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  let socket: Hume.empathicVoice.chat.ChatSocket | null = null;

  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  const initializeConnection = async () => {
    const humeClient = new HumeClient({
      apiKey: "OFMg1SxtmcuixOeof2dRUhfRGWCifWY7MfSpJ97h9txv2e2G",
      secretKey: "d74GmHknT9UY51FM3S6IfN7JfKWrqdyMCy6yxmRdCL1DAHo2hM2tYlCI7m4hCiJc"
    });
    setClient(humeClient);


    //https://api.hume.ai/v0/evi/twilio?config_id=c8e7beca-b683-481c-a23e-dd7b4e07a7d4&api_key=OFMg1SxtmcuixOeof2dRUhfRGWCifWY7MfSpJ97h9txv2e2G

    const initializeChatSocket = async () => {
      if (client) {
        try {
          const chatSocket = await client.empathicVoice.chat.connect({
            configId: "c8e7beca-b683-481c-a23e-dd7b4e07a7d4",
            resumedChatGroupId: chatGroupId
          });

          chatSocket.on("open", handleWebSocketOpenEvent);
          chatSocket.on("message", handleWebSocketMessageEvent);
          chatSocket.on("error", handleWebSocketErrorEvent);
          chatSocket.on("close", handleWebSocketCloseEvent);

          socket = chatSocket;

          subscribeToChatRoom(id, handleMessageReceived);
        } catch (error) {
          console.error('Error connecting to Hume chat socket:', error);
        }
      }
    };

    initializeChatSocket();
  };

  useEffect(() => {
    if (audioQueue.length > 0) {
      playAudio();
    }
  }, [audioQueue]);

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
    await unsubscribeFromChatRoom(id);
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
    if (audioQueue.length === 0) return;

    const audioUrl = audioQueue.shift();
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.0; // Ensure the playback rate is normal
      setCurrentAudio(audio);
      audio.play();

      audio.onended = () => {
        setCurrentAudio(null);
        if (audioQueue.length > 0) {
          playAudio();
        }
      };

      audio.onerror = () => {
        console.error('Error playing audio');
        setCurrentAudio(null);
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
  };

  const handleWebSocketOpenEvent = async () => {
    setConnected(true);
    console.log('WebSocket connection opened.');
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
    switch (message.type) {
      case "chat_metadata":
        setChatGroupId(message.chatGroupId);
        break;
      case "audio_output":
        const audioOutput = message.data as Hume.empathicVoice.AudioOutput;
        sendAudioMessage(audioOutput);
        break;
      case "user_message":
      case "assistant_message":
        const { role, content } = message.message;
        const topThreeEmotions = extractTopThreeEmotions(message);
        appendMessage(role, content ?? "", topThreeEmotions);
        sendTextMessage(content);
        break;
      case "tool_call":
        handleToolCallMessage(message, socket, id);
        break;
      default:
        console.log('Unhandled message type:', message.type);
        break;
    }
  };

  const sendAudioMessage = async (base64Audio: string) => {
    try {
      const response = await axios.post(`/chat_rooms/${id}/messages`, {
        content: base64Audio,
        user_id: 1, // Replace with actual user id
        chat_room_id: id, // Replace with actual chat room id
        content_type: 'audio',
      });

      if (response.status === 201) {
        console.log(response.data);
      }
    } catch (error) {
      console.error('Error sending audio message', error);
    }
  };

  const sendTextMessage = async (message: string) => {
    try {
      const response = await axios.post(`/chat_rooms/${id}/messages`, {
        content: message,
        user_id: 1, // Replace with actual user id
        chat_room_id: id, // Replace with actual chat room id
        content_type: 'text',
      });

      if (response.status === 201) {
        console.log(response.data);
      }
    } catch (error) {
      console.error('Error sending text message', error);
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
    await initializeConnection();
  };

  return (
    <div id="app">
      <div id="btn-container">
        <button id="start-btn" onClick={handleStartCall}>Start</button>
        <button id="stop-btn" onClick={stopAudio} disabled={!connected}>Stop</button>
      </div>
      <div id="heading-container">
        <h2>Empathic Voice Interface (EVI)</h2>
        <p>
          Welcome to our TypeScript sample implementation of the Empathic Voice Interface!
          Click the `start` button to start recording audio and stop to finish the interaction.
        </p>
      </div>
      <div id="chat-container">
        <div id="chat" />
      </div>
    </div>
  );
};

export default AudioChatComponent;
