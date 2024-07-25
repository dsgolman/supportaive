import Pusher from 'pusher-js';

let pusher: Pusher | null = null;

const fetchPusherConfig = async () => {
  const response = await fetch('/pusher_config');
  const data = await response.json();
  return data;
};

const initializePusher = async () => {
  if (!pusher) {
    const config = await fetchPusherConfig();
    pusher = new Pusher(config.key, {
      cluster: config.cluster,
      encrypted: true,
    });
  }
  return pusher;
};

const pusherInstance = await initializePusher();

export const subscribeToChatRoom = (chatRoomId: string, callback: (data: any) => void) => {
  const channel = pusherInstance.subscribe(`chat-room-${chatRoomId}`);
  channel.bind('audio-message', callback);
};

export const unsubscribeFromChatRoom = (chatRoomId: string) => {
  pusherInstance.unsubscribe(`chat-room-${chatRoomId}`);
};

export const sendMessageToChatRoom = async (chatRoomId: string, message: string) => {
  await axios.post(`/chat-rooms/${chatRoomId}/messages`, { content: message, content_type: 'audio' });
};


