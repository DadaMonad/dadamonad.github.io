
/**
 ## PeerJs + JSON Example
 Here, I will give a short overview on how to enable collaborative json with the
 [PeerJs](http://peerjs.com/) Connector and the Json Framework. Open
 [index.html](http://dadamonad.github.io/Yatta/examples/PeerJs-Json/index.html) in your Browser and
 use the console to explore Yatta!

 [PeerJs](http://peerjs.com) is a Framework that enables you to connect to other peers. You just need the
 user-id of the peer (browser/client). And then you can connect to it.

 First you have to include the following libraries in your html file:
 ```
<script src="http://cdn.peerjs.com/0.3/peer.js"></script>
<script src="../../build/browser/Frameworks/JsonFramework.js"></script>
<script src="../../build/browser/Connectors/PeerJsConnector.js"></script>
<script src="./index.js"></script>
 ```
### Create Connector

The PeerJs Framework requires an API key, or you need to set up your own PeerJs server.
Get an API key from the [Website](http://peerjs.com/peerserver).
The first parameter of `createPeerJsConnector` is forwarded as the options object in PeerJs.
Therefore, you may also specify the server/port here, if you have set up your own server.
 */
var yatta, yattaHandler;

/**
  This will connect to the server owned by the peerjs team.
  For now, you can use my API key.
*/

connector = new XMPPConnector("testy-xmpp-json2");
connector.debug = true
/**
  ### Yatta
  yatta is the shared json object. If you change something on this object,
  it will be instantly shared with all the other collaborators.
*/
yatta = new Yatta(connector);

window.onload = function(){
  var textbox = document.getElementById("textfield");
  yatta.observe(function(events){
    for(var i=0; i<events.length; i++){
      var event = events[i];
      if(event.name === "textfield" && event.type !== "delete"){
        //yatta.val("textfield").bind(textbox);
        yatta.val("textfield").bind(document.querySelector("h1"))
      }
    }
  });
  connector.whenSynced(function(){
    if(yatta.val("textfield") == null){
      yatta.val("textfield","stuff", "mutable");
    }
  })

};