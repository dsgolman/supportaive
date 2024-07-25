import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Hume,
  HumeClient,
  convertBlobToBase64,
  convertBase64ToBlob,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  MimeType,
} from 'hume';
import axios from '../services/axiosInstance';
import { handleToolCallMessage } from '../services/handleToolCall'
import { subscribeToChatRoom, unsubscribeFromChatRoom } from '../services/pusherService';

const AudioChatComponent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<HumeClient | null>(null);
  // const [socket, setSocket] = useState<Hume.empathicVoice.chat.ChatSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resumeChats, setResumeChats] = useState(true);
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);

  const mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  let socket: Hume.empathicVoice.chat.ChatSocket | null = null;

  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying) {
      playAudio();
    }
  }, [audioQueue, isPlaying]);

  const connect = async () => {
    if (!client) {
      const humeClient = new HumeClient({
        apiKey: "OFMg1SxtmcuixOeof2dRUhfRGWCifWY7MfSpJ97h9txv2e2G",
        secretKey: "d74GmHknT9UY51FM3S6IfN7JfKWrqdyMCy6yxmRdCL1DAHo2hM2tYlCI7m4hCiJc",
      });
      setClient(humeClient);
    }

    if (client) {
      const chatSocket = await client.empathicVoice.chat.connect({
        configId: "c8e7beca-b683-481c-a23e-dd7b4e07a7d4",
        resumedChatGroupId: chatGroupId,
      });

      chatSocket.on("open", handleWebSocketOpenEvent);
      chatSocket.on("message", handleWebSocketMessageEvent);
      chatSocket.on("error", handleWebSocketErrorEvent);
      chatSocket.on("close", handleWebSocketCloseEvent);

      socket = chatSocket;

      const handleMessageReceived = (data: any) => {
        console.log(data);
        const { content, content_type } = data
        if (content_type === 'audio') {
          const audioUrl = `${content}`;
          setAudioQueue(prevQueue => [...prevQueue, audioUrl]);
        }
      };

      subscribeToChatRoom(id, handleMessageReceived);
    }
  };

  const disconnect = () => {
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

    unsubscribeFromChatRoom(id);
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

  const handleWebSocketOpenEvent = async () => {
    setConnected(true);
    // await captureAudio();
  };

  const handleWebSocketMessageEvent = async (message: Hume.empathicVoice.SubscribeEvent) => {
    console.log(message);
    switch (message.type) {
      case "chat_metadata":
        setChatGroupId(message.chatGroupId);
        break;
      // append user and assistant messages to UI for chat visibility
      case "user_message":
      case "assistant_message":
        const { role, content } = message.message;
        const topThreeEmotions = extractTopThreeEmotions(message);
        appendMessage(role, content ?? "", topThreeEmotions);
        break;
      case "audio_output":
        const audioOutput = message.data;
        await sendAudioMessage(audioOutput);
        break;
      case "user_interruption":
        stopAudio();
        break;
      case "tool_call":
      	console.log(socket);
        handleToolCallMessage(message, socket, id);
        break;
      case "tool_response":
      	console.log(message.content);
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

  const handleWebSocketErrorEvent = (error: Error) => {
    console.error(error);
  };

  const handleWebSocketCloseEvent = async () => {
    if (connected) await connect();
    console.log("Web socket connection closed");
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

  return (
    <div id="app">
      <div id="btn-container">
        <button id="start-btn" onClick={connect}>Start</button>
        <button id="stop-btn" onClick={disconnect} disabled={!connected}>Stop</button>
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
