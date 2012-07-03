require 'rubygems'
require 'bundler/setup'

require 'sinatra'
require 'haml'
require 'redis'
require 'json'

if development?
  ENV["REDISTOGO_URL"] = "redis://127.0.0.1:6379"
end

class WebrtcApp < Sinatra::Base

  connections = {}
  timers = {}

  configure do
    set :root, File.expand_path("../../", __FILE__)
    uri = URI.parse(ENV["REDISTOGO_URL"])
    REDIS = Redis.new(
      :host => uri.host, :port => uri.port, :password => uri.password
    )
    enable :sessions
    set :session_secret, "alkdsjflaksdfjlkj123aasd"
    enable :logging
  end

  before '/talk' do
    redirect "/" unless session[:username]
  end

  get "/" do
    redirect "/talk" if session[:username]
    haml :index
  end

  post "/sessions/create" do
    session[:username] = params[:username]
    redirect "/talk"
  end

  get "/talk" do
    @username = session[:username]
    haml :talk
  end

  get "/sse" do
    content_type 'text/event-stream'
    stream(:keep_open) { |out|
      if timer = timers[session[:username]]
        timer.cancel
      end
      timers[session[:username]] =
        EventMachine::PeriodicTimer.new(2) {
          # TODO: cancel timer if out connection is dead?
          p "updating who's online for #{session[:username]}"
          out << "event:users_online\ndata:#{connections.keys.join(",")}\n\n"
        }
      connections[session[:username]] = out
    }
  end
end
