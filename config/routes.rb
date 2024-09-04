Rails.application.routes.draw do
  root to: 'homepage#index'

  namespace :api do
    resources :chat_rooms, only: [:index, :show, :create] do
      member do
        get :participants
        get :moderator
      end
      resources :messages, only: [:index, :create]
    end
  end

  get 'pusher_config', to: 'pusher_config#show'

  

  get '*path', to: 'homepage#index', constraints: ->(request) do
    !request.xhr? && request.format.html?
  end


    
end
