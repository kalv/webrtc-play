require 'rubygems'
require 'bundler/setup'

require 'sinatra'

if development?
  ENV["REDISTOGO_URL"] = "redis://127.0.0.1:6379"
end

class WebrtcApp < Sinatra::Base
  get "/" do
    "hello"
  end
end
