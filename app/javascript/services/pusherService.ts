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

export const subscribeToChatRoom = async (chatRoomId: string, callback: (data: any) => void) => {
  const pusherInstance = await initializePusher();
  const channel = pusherInstance.subscribe(`chat_room_${chatRoomId}`);
  channel.bind('new_message', callback);
  // channel.bind('audio_message', callback);  // Bind to audio message events
};

export const unsubscribeFromChatRoom = async (chatRoomId: string) => {
  const pusherInstance = await initializePusher();
  pusherInstance.unsubscribe(`chat_room_${chatRoomId}`);
};
