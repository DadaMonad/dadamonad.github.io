---
layout: y-page
title: Shared dom document with y-xml
permalink: /examples/shared-html/
---

<script src="/bower_components/yjs/y.js"></script>

<script src="/bower_components/y-xmpp/y-xmpp.js"></script>
<script src="/bower_components/y-list/y-list.js"></script>
<script src="/bower_components/y-xml/y-xml.js"></script>
<script src="http://code.jquery.com/jquery-2.1.4.min.js"></script>

<script>
  var connector = new Y.XMPP({role: "slave", websocket: "ws:yatta.ninja:5280/xmpp-websocket"}).join("shared-html");
  var y = new Y(connector);
  connector.whenSynced(function(){
    window.shared = document.querySelector("#shared");
    if(y.val("dom") == null){
      // check if dom was already assigned
      y.val("dom", new Y.Xml.Element(window.shared));
    }

  })
  y.observe(function(events){
    for(i in events){
      if(events[i].type === "add" || events[i].type === "update"){
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
    }

  })
</script>

The *div* element *#shared* is an html element that is shared among all users on this site. This feature is provided by the [y-xml](https://github.com/y-js/y-xml) type for [Yjs](https://github.com/y-js/yjs). You may open your browser console and add content, or motify it. The changes will be propagated to all users in real time. You may also use jquery to change it. There are, however, some DOM features that are not supported - so make sure to check out the [y-xml](https://github.com/y-js/y-xml) repository before you file a bug.

<div id="shared">
  <h2> Here it comes.. </h2>
  <p> Some initial, shared content. </p>
</div>
