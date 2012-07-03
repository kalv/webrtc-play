var App = {
  connection: undefined,
  username: undefined,
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
  }
}

$(document).ready(function() {
  App.openSSE();
});
