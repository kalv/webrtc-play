var App = {
  connection: undefined,
  username: undefined,
  localStream: undefined,
  pc1: undefined,
  pc2: undefined,
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
          status.append("<p>"+username+"<button onclick='App.call()'>Call</button></P>");
        }
      });
      if (status.text() == "") {
        status.append("<p>No one yet.</p>");
      }
    });
  },
  call: function() {
    App.pc1 = new webkitPeerConnection00(null,App.iceCallback1);
    console.log("Created local peer connection object pc1"); 
    App.pc2 = new webkitPeerConnection00(null,App.iceCallback2);
    console.log("Created remote peer connection object pc2");
    App.pc2.onaddstream = App.gotRemoteStream;

    App.pc1.addStream(App.localstream);
    console.log("Adding Local Stream to peer connection");

    var offer = App.pc1.createOffer(null);
    console.log("Created offer:\n" + offer.toSdp());
    App.pc1.setLocalDescription(App.pc1.SDP_OFFER, offer);
    console.log("SetLocalDesc1");
    App.pc2.setRemoteDescription(App.pc2.SDP_OFFER, offer);
    console.log("SetRemoteDesc2");

    var answer = App.pc2.createAnswer(offer.toSdp(), {has_audio:true, has_video:true});;
    console.log("Created answer:\n" + answer.toSdp());
    App.pc2.setLocalDescription(App.pc2.SDP_ANSWER, answer);
    console.log("SetLocalDesc2");
    App.pc1.setRemoteDescription(App.pc1.SDP_ANSWER, answer);
    console.log("SetRemoteDesc1");
    //ta2.value = answer.toSdp();
    App.pc1.startIce(); // Start finding local ice candidates. Once it finds candidates it will call icecallback
    App.pc2.startIce(); //Starts finding remote ice candidates. Once it finds candidates it will call iceCallback2
    console.log("Started ICE for both local & remote");
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
  },
  iceCallback1: function(candidate, bMore) {
    if (candidate) {
      App.pc2.processIceMessage(candidate);
      console.log("Local ICE candidate: " + candidate.toSdp());
    }
  },
  iceCallback2: function(candidate, bMore) {
    if (candidate) {
      App.pc1.processIceMessage(candidate);
      console.log("Remote ICE candidate: " + candidate.toSdp());
    }
  }
}

$(document).ready(function() {
  App.openSSE();
  App.startCamera();
});
