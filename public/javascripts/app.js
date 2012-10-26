window.PeerConnection = /*webkitRTCPeerConnection || */window.webkitPeerConnection00;

var App = {
  connection: undefined,
  username: undefined,
  localStream: undefined,
  pc: undefined,
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
          status.append("<p>"+username+"<button onclick='App.call(\""+username+"\")'>Call</button></P>");
        }
      });
      if (status.text() == "") {
        status.append("<p>No one yet.</p>");
      }
    });

    App.connection.addEventListener('incoming_call', function(e) {
      var call = e.data.split("----");
      var offerSdp = JSON.parse(call[0]);
      var username = call[1];

      //console.log("Call offer coming in from "+ call.username);
      //console.log(call.offer);
      var offer = new SessionDescription(offerSdp);
      try {
        App.pc.setRemoteDescription(App.pc.SDP_OFFER, offer);
      }
      catch (e) {
        console.log("Error setRemoteDescription: " + e);
        console.log("trying again");
        App.pc.setRemoteDescription(App.pc.SDP_OFFER, offer);
      }

      try {
        var answer = App.pc.createAnswer(offerSdp, {has_audio:true, has_video:true});
        console.log("Created answer, now sending...");
        App.pc.setLocalDescription(App.pc.SDP_ANSWER, answer);

        // SEND Answer to CALLER
        $.post("/answer_call/"+username, {answer: JSON.stringify(answer.toSdp())}, function(){
          // delay a little to ensure other party as set the answer and is started first
          // with WS, send an answered and ready status perhaps
          setTimeout(function() {
            App.pc.startIce();
          },500);
        });
      } catch (e) {
        console.log("error creating an answer: " + e);
      }
    });

    App.connection.addEventListener('answer_call', function(e) {
      var call = e.data.split("----");
      var username = call[1];
      var answerSdp = JSON.parse(call[0]);

      var answer = new SessionDescription(answerSdp);
      console.log("Call answer coming in from " + username);

      App.pc.setRemoteDescription(App.pc.SDP_ANSWER, answer);
      App.pc.startIce();
    });
  },
  call: function(username) {

    var offer = App.pc.createOffer(null);
    console.log("Sending offer to remote");
    //console.log("Created offer:\n" + offer.toSdp());
    App.pc.setLocalDescription(App.pc.SDP_OFFER, offer);

    // SEND TO callee
    $.post("/call_user/"+username, {offer: JSON.stringify(offer.toSdp())}, function() {});
  },
  gotRemoteStream: function(e) {
    console.log("=== Got a remote stream / Connecting to video....");
    $("video#remote").attr("src", webkitURL.createObjectURL(e.stream));
  },
  startCamera: function() {
    console.log("Requesting local stream");
    navigator.webkitGetUserMedia({audio:true, video:true}, App.gotStream, function() {});

  },
  // Set up local stream video and start a peer connection
  gotStream: function(stream) {
    $("video#local").attr("src", webkitURL.createObjectURL(stream));
    App.localstream = stream;

    // set up peer connections
    console.log("Adding Local Stream to peer connection");
    //App.pc = new PeerConnection(null, App.iceCallback);
    App.pc = new PeerConnection("STUN stun.l.google.com:19302", App.iceCallback);
    App.pc.onaddstream = App.gotRemoteStream;
    App.pc.addStream(App.localstream);
  },
  iceCallback: function(candidate, bMore) {
    if (candidate) {
      App.pc.processIceMessage(candidate);
      //console.log("Local ICE candidate: " + candidate.toSdp());
    }
  },
}

$(document).ready(function() {
  App.openSSE();
  App.startCamera();
});
