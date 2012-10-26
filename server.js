
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes/index')
  , sessions = require('./routes/sessions')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('webrtc-1231409usdfsakfkj21231'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/sessions/create', sessions.create);
app.get('/talk', routes.talk);


var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var usernames_online = [];
var usernames_sockets = {};

io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {

  socket.on('set username', function(data){
    console.log("new username online: " + data.username);
    socket.set("username", data.username); // for disconnection and remove of presence
    usernames_online.push(data.username);
    usernames_sockets[data.username] = socket;
  });

  socket.on('message', function (data) {
    console.log("=== relaying message to " + data.toUsername +" from: " + data.fromUsername);
    usernames_sockets[data.toUsername].emit("message", data);
  });
});

setInterval(function() {
  io.sockets.emit('users-online', usernames_online);
}, 1500);
