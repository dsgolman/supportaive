class Api::MessagesController < ApplicationController
  skip_before_action :verify_authenticity_token, if: :json_request?

  def index
    @messages = Message.where(chat_room_id: params[:chat_room_id])
    render json: @messages
  end

  def create
    @message = Message.new(message_params)
    
    if @message.save
      # Check if the content is audio
      if @message.content_type == 'audio'
        # Handle audio content separately
        handle_audio_message(@message)
      else
        # Handle text content as usual
        handle_text_message(@message)
      end
    else
      render json: @message.errors, status: :unprocessable_entity
    end
  end

  protected

  def json_request?
    request.format.json?
  end

  private

  def handle_text_message(message)
    Pusher.trigger("chat_room_#{message.chat_room_id}", 'new_message', {
      id: message.id,
      content: message.content,
      user_id: message.user_id,
      chat_room_id: message.chat_room_id,
      content_type: 'text'
    })
    render json: message, status: :created
  end

  def handle_audio_message(message)
    audio_data = params[:message][:content]
    decoded_data = Base64.decode64(audio_data)
    audio_file = Tempfile.new(['audio', '.webm'])
    audio_file.binmode
    audio_file.write(decoded_data)
    audio_file.rewind

    message.audio_file.attach(io: audio_file, filename: 'audio.webm', content_type: 'audio/webm')

    if message.audio_file.attached?
      audio_url = url_for(message.audio_file)
      Pusher.trigger("chat_room_#{message.chat_room_id}", 'new_message', {
        content: audio_url, # URL of the audio file
        user_id: message.user_id,
        chat_room_id: message.chat_room_id,
        content_type: 'audio'
      })
      render json: message, status: :created
    else
      render json: { error: 'Failed to attach audio file' }, status: :unprocessable_entity
    end

    audio_file.close
    audio_file.unlink
  end

  def message_params
    params.require(:message).permit(:content, :user_id, :chat_room_id, :content_type)
  end
end
