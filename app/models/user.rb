class User < ApplicationRecord
	has_many :chat_room_users
  	has_many :chat_rooms, through: :chat_room_users
end
