class AddChatGroupIdToChatRoom < ActiveRecord::Migration[6.1]
  def change
    add_column :chat_rooms, :chat_group_id, :integer
  end
end
