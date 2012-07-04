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
      call = JSON.parse(e.data)
      console.log("Call offer coming in from "+ call.username);
      console.log(call.offer);
      var offer = new SessionDescription(call.offer);
      App.pc.setRemoteDescription(App.pc.SDP_OFFER, offer);

      //answer = App.pc.createAnswer(offer, {has_audio:true, has_video:true});
      //console.log("Created answer:\n"+answer.toSdp());
      //App.pc.setLocalDescription(App.pc.SDP_ANSWER, answer);

      //// SEND Answer to CALLER
      //$.post("/answer_call/"+call.username, {answer: answer.toSdp()}, function(){
      //  App.pc.startIce();
      //});

      //TODO waitForRemoteVideo() ?
    });

    App.connection.addEventListener('answer_call', function(e) {
      console.log("Call answer coming in from " + e.data.username);

      App.pc.setRemoteDescription(App.pc.SDP_ANSWER, e.data.answer);
      App.pc.startIce();
    });
  },
  call: function(username) {

    var offer = App.pc.createOffer(null);
    console.log("Created offer:\n" + offer.toSdp());
    App.pc.setLocalDescription(App.pc.SDP_OFFER, offer);

    // SEND TO callee
    $.post("/call_user/"+username, {offer: offer.toSdp()}, function() {});
  },
  gotRemoteStream: function(e) {
    console.log("=== Got a remote stream");
    $("video#remote").attr("src", webkitURL.createObjectURL(e.stream));
    console.log("=== Set Remote stream");
  },
  startCamera: function() {
    console.log("Requesting local stream");
    navigator.webkitGetUserMedia({audio:true, video:true}, App.gotStream, function() {});

  },
  gotStream: function(stream) {
    $("video#local").attr("src", webkitURL.createObjectURL(stream));
    App.localstream = stream;

    // set up peer connections
    App.pc = new webkitPeerConnection00(null,App.iceCallback);
    App.pc.onaddstream = App.gotRemoteStream;
    App.pc.addStream(App.localstream);
    console.log("Adding Local Stream to peer connection");
  },
  iceCallback: function(candidate, bMore) {
    if (candidate) {
      App.pc.processIceMessage(candidate);
      console.log("Local ICE candidate: " + candidate.toSdp());
    }
  },
}

$(document).ready(function() {
  App.openSSE();
  App.startCamera();
});
