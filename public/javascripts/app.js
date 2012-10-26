window.RTCPeerConnection || (window.RTCPeerConnection = webkitRTCPeerConnection || window.webkitPeerConnection00);
window.SessionDescription = RTCSessionDescription || SessionDescription;
window.IceCandidate = RTCIceCandidate || IceCandidate;
window.URL || (window.URL = window.webkitURL);
navigator.getUserMedia || (navigator.getUserMedia = navigator.webkitGetUserMedia);

var App = {
  connection: undefined,
  username: undefined,
  callUsername: undefined,
  pc: undefined,
  started: false,
  openSSE: function() {
    console.log("Opening SSE connection");
    App.connection = new EventSource("/sse");

    App.connection.addEventListener('open', function(e) {
      console.log("Connection opened to SSE");
    }, false);

    App.connection.addEventListener('error', function(e) {
    }, false);

    App.connection.addEventListener('users_online', function(e) {
      var status = $("#users_online");
      status.text("");
      $.each(e.data.split(","), function(i, username) {
        if (App.username != username) {
          status.append("<p>"+username+"<button onclick='App.start(\""+username+"\")'>Call</button></P>");
        }
      });
      if (status.text() == "") {
        status.append("<p>No one yet.</p>");
      }
    });

    App.connection.addEventListener('message', App.handleMessage);
  },
  start: function(username) {
    App.callUsername = username;

    console.log("starting RTC");

    var pcConfig = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

    App.pc = new RTCPeerConnection(pcConfig);

    // send any ice candidates to the other peer
    App.pc.onicecandidate = function (e) {
      if (e.candidate) {
        console.log("On ice candidate");
        $.post(
          "/message/" + App.callUsername,
          JSON.stringify({
            "candidate": e.candidate,
            "label": e.candidate.sdpMLineIndex,
            "fromUsername" : App.username}),
          function() {}
        );
      }
    };

    // once remote stream arrives, show it in the remote video element
    App.pc.onaddstream = function (e) {
      console.log("Adding remote stream");
      $("video#remote").attr("src",URL.createObjectURL(e.stream));
    };

    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
      $("video#local").attr("src", URL.createObjectURL(stream));
      App.pc.addStream(stream);
      App.started = true;

      if (username) {
        console.log("creating an offer");
        App.pc.createOffer(App.gotDescription);
      }
      else {
        console.log("creating an answer");
        App.pc.createAnswer(App.gotDescription);
      }
    });
  },
  gotDescription: function(desc) {
    App.pc.setLocalDescription(desc);
    $.post(
      "/message/" + App.callUsername,
      JSON.stringify({ "sdp": desc, "fromUsername" : App.username }),
      function() {}
    );
  },
  handleMessage: function(e) {
    console.log("Handle message");
    var signal = JSON.parse(e.data);
    console.log(signal);

    if (!App.pc)
      App.start(false);

    // Set who you're having the call with to send messages only to them
    if (!App.callUsername)
      App.callUsername = signal.fromUsername;

    if (signal.sdp) {
      console.log("Adding remote sdp");
      App.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    else if (App.started) {
      console.log("Adding ice candidate");
      console.log(signal.label);
      var candidate = new RTCIceCandidate({sdpMLineIndex:signal.label,
                                           candidate:signal.candidate});

      App.pc.addIceCandidate(candidate);
    }
  },
}

$(document).ready(function() {
  App.openSSE();
});
