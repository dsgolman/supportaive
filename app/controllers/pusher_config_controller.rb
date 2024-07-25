class PusherConfigController < ApplicationController
  def show
    render json: {
      key: ENV['PUSHER_KEY'],
      cluster: ENV['PUSHER_CLUSTER']
    }
  end
end
