---
layout: y-page
title: Shared dom document with y-xml
permalink: /examples/shared-html/
---

<script src="/bower_components/yjs/y.js"></script>

<script src="/bower_components/y-webrtc/y-webrtc.js"></script>
<script src="/bower_components/y-list/y-list.js"></script>
<script src="/bower_components/y-text/y-text.js"></script>
<script src="/bower_components/y-xml/y-xml.js"></script>
<script src="http://code.jquery.com/jquery-2.1.4.min.js"></script>

The *div* element *#shared* is an html element that is shared among all users on this site. This feature is provided by the [y-xml](https://github.com/y-js/y-xml) type for [Yjs](https://github.com/y-js/yjs). You may open your browser console and add content, or motify it. The changes will be propagated to all users in real time. You may also use jquery to change it. There are, however, some DOM features that are not supported - so make sure to check out the [y-xml](https://github.com/y-js/y-xml) repository before you file a bug.

<div class="command">
  <button type="button">Execute</button>
  <input type="text" value='$("#shared").append("<h3>Appended content</h3>")' size="40"/>
</div>
<div class="command">
  <button type="button">Execute</button>
  <input type="text" value='$("#shared h3").remove()' size="40"/>
</div>
<div class="command">
  <button type="button">Execute</button>
  <input type="text" value='$("#shared p").attr("align","right")' size="40"/>
</div>
<div class="command">
  <button type="button">Execute</button>
  <input type="text" value='$("#shared h3").attr("style","color:blue;")' size="40"/>
</div>

<script>
  var commands = document.querySelectorAll(".command");
  for(var i=0; i < commands.length; i++){
    (function(command){
      var execute = function(){
        eval(command.querySelector("input").value);
      }
      command.querySelector("button").onclick = execute
      $(command.querySelector("input")).keyup(function (e) {
        if (e.keyCode == 13) {
          execute()
        }
      })
    })(commands[i])
  }
</script>
<br>

<div id="shared">
  <h2> Here it comes.. </h2>
  <p> Some initial, shared content. </p>
</div>

<script>
  var connector = new Y.WebRTC("shared-html");
  var y = new Y(connector);
  connector.whenSynced(function(){
    window.shared = document.querySelector("#shared");
    if(y.val("dom") == null){
      // check if dom was already assigned
      y.val("dom", new Y.Xml.Element(window.shared));
    }
    for(var i=0; i<4; i++){
      if(y.val("command"+i) == null){
        y.val("command"+i, new Y.Text(commands[i].querySelector("input").value))
      }
    }
  })
  y.observe(function(events){
    for(i in events){
      if(events[i].name === "dom" && (events[i].type === "add" || events[i].type === "update")){
        // Everytime the "dom" is replaced, remove the old one from the body and but the new one there instead
        if(window.shared == null){
          window.shared = document.querySelector("#shared");
        }
        var parent = window.shared.parentElement,
            ydom = y.val("dom");

        if(ydom == null){
          return
        }
        var dom = ydom.getDom();
        window.shared.remove();
        window.shared = y.val("dom").getDom();
        var body = document.querySelector("body");
        parent.insertBefore(window.shared, null);
      }
      else if(events[i].name.substr(0,7) === "command" && (events[i].type === "add" || events[i].type === "update")){
        var command_number = events[i].name.substr(7);
        var commands = document.querySelectorAll(".command");
        y.val(events[i].name).bind(commands[command_number].querySelector("input"))
      }

    }
  })
</script>
