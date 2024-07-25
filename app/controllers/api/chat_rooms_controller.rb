class Api::ChatRoomsController < ApplicationController
  # Ensure responses are formatted as JSON
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :set_chat_room, only: [:show]

  def index
    @chat_rooms = ChatRoom.all
    render json: @chat_rooms, status: :ok
  end

  def show
    render json: @chat_room, status: :ok
  end

  def create
    @chat_room = ChatRoom.new(chat_room_params)
    if @chat_room.save
      render json: @chat_room, status: :created
    else
      render json: @chat_room.errors, status: :unprocessable_entity
    end
  end

  def participants
    chat_room = ChatRoom.find(params[:id])
    participants = chat_room.users.select(:id, :name) # Assuming users have an id and name attribute

    render json: { participants: participants }
  end

  protected

  def json_request?
    request.format.json?
  end

  private

  def set_chat_room
    @chat_room = ChatRoom.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Chat Room not found' }, status: :not_found
  end

  def chat_room_params
    params.require(:chat_room).permit(:name)
  end
end
