---
layout: post
title:  "Howto create your own Connector"
date:   2015-02-11 00:56:45
description: Howto create your own Connector
categories:
  - Yjs
  - Connector
---

If you want to integrate Yjs in you existing project, you most likely already set up some infrastructure to communicate with your clients. Maybe you have a paid plan at [pusher](https://pusher.com/) or you are really into [Socket.io](http://socket.io), or you just rather want to use [Matrix](http://matrix.org/) as an underlying communication protocol. There is no need to be satisfied with the awesome [XMPP connector](https://github.com/rwth-acis/y-xmpp) to propagate document updates. Build your own connector! It's easy!

In this article I'll explain how you can create your own connector. You can use _any_ communication protocol - whether it is a P2P based, federated, or client-server.

### Choose a Sync Method

There are two ways how your clients can synchronize with each other. The XMPP connector actually supports both sync methods. But it is totally fine if you only choose one of them:

SyncAll Sync Method
: This sync method originates from the original WebRTC connector. Everyone synchronizes with each other: Right after the connection is created, the peers exchange a state vector, and then send all the remaining Operations to the other users. After that, the connector only has to make sure that all sent operations reach all the other peers. I got feedback that this is the prefferred method to use, because there is no set-up involved. This method is totally fine and efficient for small networks, but is not well suited for a lot of users.

Master-Slave Sync Method
: Here, we have one or several *master* clients online that serve as the endpoint for the syncing process of the *slaves*. Therefore, you only have to sync once, even if there are thousands of users online. Still, operations can be published p2p (they don't have to go through the master-client). But you have to make sure that the master client(s) have a high uptime. They should not leave the session while a user syncs with it.

You could create a master client with nodejs, that runs on our server/cloud.
If you do not have (or do not want to have) a nodejs server instance, that can preserve the state of the shared document, you can choose the SyncAll sync method. Otherwise, you should go with the Master-Slave sync method.

### Initializing the Connector
As you probably know, you initialize an instance of Y like this:
{% highlight javascript %}
  var y = new Y(connector)
{% endhighlight %}

We say, that the connector is now bound to Y. This process involves copying all the properties of the [ConnectorClass](https://github.com/rwth-acis/yjs/blob/master/lib/ConnectorClass.coffee) to the `connector`. At some point you have to *initialize* the connector with the chosen sync method, the *role*, and a unique *user_id*. You can do this at any moment, even after the user created properties on the shared document.

{% highlight javascript %}
// the communication protocol is completely set up
// and is ready to propagate messages
var when_bound_to_y = function(){
  // when the connector is bound to Y,
  // e.g. by creating a new instance of Y,
  // initialize the connector with the required parameters.
  // You always must specify `role`, `syncMethod`, and `user_id`
  connector.init({
    role : "slave", // or "master"
    syncMethod : "syncAll", // or "master-slave"
    user_id : user_id
  });
};

if(connector.is_bound_to_y){
  // The connector is already bound to Y, so we can execute
  // `when_bound_to_y` immediately
  when_bound_to_y();
} else {
  // The connector has not yet been bound to Y
  // on_bound_to_y is called when the connector is bound to Y
  connector.on_bound_to_y = when_bound_to_y;
}
{% endhighlight %}


### Collaborator joins / leaves a session
Whenever a user joins or leaves a session, you have to notify the connector class that it happened.

Let the `protocol` variable be some communication protocol that supports events.

{% highlight javascript %}
protocol.on("userJoinedSession", function(user){
  // a new user joined the session.
  // Notify the connector class, if the connector
  // is already initialized
  if(connector.is_initialized){
    // you must specify the id and
    // the role ("master" or "slave") of the user
    connector.userJoined(user.id, user.role);
  }
});
{% endhighlight %}

{% highlight javascript %}
protocol.on("userLeftSession", function(user){
  // a user left the session.
  // Notify the connector class, if the connector
  // is already initialized
  if(connector.is_initialized){
    // you must specify the id
    connector.userLeft(user.id);
  }
});
{% endhighlight %}

### Specify how to send and receive messages
You must specify how to *send*, *broadcast*, and how to *receive* messages. A message is a json object that may contain numbers, and strings. It is your responsibility that they arrive. In order to prevent encoding issues you may want to transform the object to a string with `JSON.stringify(message)` and parse it back with `JSON.parse(string_message)`.

##### 1. How to send a message to a specific user

{% highlight javascript %}
connector.send = function(user_id, message){
  protocol.send(user_id, JSON.stringify(message));
}
{% endhighlight %}

##### 2. How to broadcast a message to all users

Maybe your protocol supports broadcasting. Otherwise you could send the message to all users directly too.

{% highlight javascript %}
connector.broadcast = function(message){
  protocol.broadcast(JSON.stringify(message));
}
{% endhighlight %}

##### 3. How to receive a message

You have to check if the connector is already initialized, otherwise the `receiveMessage` method may not exist yet!

{% highlight javascript %}
protocol.on("message", function(message){
  // The client received a message
  // Check if the connector is already initialized,
  // only then forward the message to the connector class
  if(connector.is_initialized){
    connector.receiveMessage(user_id, JSON.parse(message));
  }
})
{% endhighlight %}

# Conclusion
Creating a connector isn't that hard. It is something that distinguishes Yjs from similar frameworks. You can choose a communication protocol that fits your requirements, and integrates well into your existing infrastructure.

The [webrtc connector](https://github.com/rwth-acis/y-webrtc) is a great starting point for your connector project, because it is pretty well documented. You can use it even if you choose the master-slave sync method.

Contact me if you need any help creating your own connector.








