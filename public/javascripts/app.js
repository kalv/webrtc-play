window.RTCPeerConnection || (window.RTCPeerConnection = webkitRTCPeerConnection || window.webkitPeerConnection00);
window.SessionDescription = RTCSessionDescription || SessionDescription;
window.IceCandidate = RTCIceCandidate || IceCandidate;
window.URL || (window.URL = window.webkitURL);
navigator.getUserMedia || (navigator.getUserMedia = navigator.webkitGetUserMedia);

var App = {
  socket: undefined,
  username: undefined,
  pc: undefined,
  started: false,
  localStream: false,
  remoteStream: false,
  localVideo: undefined,
  remoteVideo: undefined,
  callUsername: undefined,
  openSocket: function() {
    console.log("Opening Socket connection");
    App.socket = io.connect('http://' + document.location.host);

    App.socket.on("connect", function() {
      App.socket.emit("set username", {username: App.username})
    });

    App.socket.on('users-online', function(data) {
      var status = $("#users_online");
      status.text("");
      $.each(data, function(i, username) {
        if (App.username != username) {
          status.append("<p>"+username+"<button onclick='App.start(\""+username+"\")'>Call</button></p>");
        }
      });
      if (status.text() == "") {
        status.append("<p>No one yet.</p>");
      }

    });

    App.socket.on('message', App.handleMessage);
  },
  getUserMedia: function() {
    navigator.webkitGetUserMedia({'audio':true, 'video':true}, App.onUserMediaSuccess,
                                   App.onUserMediaError);
    console.log("Requested access to local media with new syntax.");
  },
  // Initiator from click of 'call' button
  start: function(username) {
    App.callUsername = username;
    App.startPeer(true);
  },
  // send a has of information
  sendMessage: function(data) {
    data["toUsername"] = App.callUsername;
    data["fromUsername"] = App.username;
    App.socket.emit('message', data);
  },
  createPeerConnection: function() {
    var pcConfig = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    App.pc = new RTCPeerConnection(pcConfig);

    App.pc.onicecandidate = App.onIceCandidate;
    App.pc.onaddstream = App.onRemoteStreamAdded;
    console.log("Created peer connection");
  },
  startPeer: function(startCall) {
    if (!App.started && App.localStream) {
      console.log("Connecting...");
      App.createPeerConnection();
      App.pc.addStream(App.localStream);
      App.started = true;
      if (startCall)
        App.startCall();
    }
  },
  startCall: function() {
    console.log("Sending offer to peer");
    App.pc.createOffer(App.setLocalAndSendMessage, null, {'has_audio':true, 'has_video':true});
  },
  startAnswer: function() {
    console.log("Sending answer to peer");
    console.log(App.pc);
    App.pc.createAnswer(App.setLocalAndSendMessage, null, {'has_audio':true, 'has_video':true});
  },
  setLocalAndSendMessage: function(desc) {
    console.log("Created SDP")
    console.log(desc);
    App.pc.setLocalDescription(desc);
    console.log("---->> Sending message");
    App.sendMessage(desc);
  },
  handleMessage: function(data) {
    var msg = data;

    console.log("--- Got message from SSE:");
    console.log(msg);

    if (msg.type == "offer") {

      if (App.callUsername == undefined) {
        console.log("Setting call from to : " + msg.fromUsername);
        App.callUsername = msg.fromUsername;
      }

      // Callee creates the peer connection
      if (App.pc == undefined && !App.started)
        App.startPeer(false);

      App.pc.setRemoteDescription(new RTCSessionDescription(msg));

      App.startAnswer();

    } else if (msg.type == "answer" && App.started) {
      App.pc.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type == "candidate" && App.started) {
      var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate: msg.candidate});
      App.pc.addIceCandidate(candidate);
    } else if (msg.type == "candidate" && !App.started) {
      console.log("GOT ICE and have no dice");
    } else if (msg.type == "bye" && App.started) {
      // App.onRemoteHangup();
    }
  },
  onUserMediaSuccess: function(stream) {
    console.log("User has granted access to local media.");
    var url = webkitURL.createObjectURL(stream);
    App.localVideo.attr("src", url);
    App.localStream = stream;
  },
  onUserMediaError: function onUserMediaError(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
  },
  onIceCandidate: function(e) {
    if (e.candidate) {
      console.log("On ice candidate");
      App.sendMessage({type: "candidate",
                  label: e.candidate.sdpMLineIndex,
                  id: e.candidate.sdpMid,
                  candidate: e.candidate.candidate});
    } else {
      console.log("End of candidates");
    }
  },
  onRemoteStreamAdded: function(e) {
    console.log("Remote stream added");
    App.remoteVideo.attr("src",URL.createObjectURL(e.stream));
    App.remoteStream = e.stream;
  }
}
