import { Hume } from "hume";
import axios from '../services/axiosInstance';

/**
 * handles ToolCall messages received from the WebSocket connection
 */ 
export async function handleToolCallMessage(
  toolCallMessage: Hume.empathicVoice.ToolCallMessage,
  socket: Hume.empathicVoice.chat.ChatSocket | null,
  chatRoomId: string
): Promise<void> {
  if (toolCallMessage.name === "get_current_participants") {
    try {
      // Assuming toolCallMessage.parameters contains the chat room ID
      // const { chatRoomId } = JSON.parse(toolCallMessage.parameters) as { chatRoomId: string };

      // Fetch the participants from the backend
      const response = await axios.get(`/chat_rooms/${chatRoomId}/participants`);
      console.log(response);
      const participants = response.data.participants;

      // Format the participants as a string or any other format needed
      const participantsList = participants.map((participant: { name: string }) => participant.name).join(", ");

      // Send ToolResponse message to the WebSocket
      const toolResponseMessage = {
        type: "tool_response",
        toolCallId: toolCallMessage.toolCallId,
        content: participantsList,
      };
      console.log(toolResponseMessage);
      console.log(socket)
      socket?.sendToolResponseMessage(toolResponseMessage);
    } catch (error) {
      // Send ToolError message to the WebSocket if there was an error fetching participants
      const participantsToolErrorMessage = {
        type: "tool_error",
        toolCallId: toolCallMessage.toolCallId,
        error: "Participants tool error",
        content: "There was an error fetching the participants",
      };

      socket?.sendToolErrorMessage(participantsToolErrorMessage);
    }
  } else {
    // Send ToolError message to the WebSocket if the requested tool was not found
    const toolNotFoundErrorMessage = {
      type: "tool_error",
      toolCallId: toolCallMessage.toolCallId,
      error: "Tool not found",
      content: "The tool you requested was not found",
    };
    console.log(toolNotFoundErrorMessage);
    socket?.sendToolErrorMessage(toolNotFoundErrorMessage);
  }
}
