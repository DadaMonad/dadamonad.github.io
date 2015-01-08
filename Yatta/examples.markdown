---
layout: yatta-page
title: Examples
permalink: /Yatta/examples/
---

This page is dedicated to examples built with Yatta. Write me, if you have something that you would like to commit!



### Yatta-Connectors
First of all, you have to define how you want your peers to connect to each other. You find a bunch of connectors in the [Yatta-Connector](https://github.com/DadaMonad/Yatta-Connectors) repository. Here, we create an XMPP-Connector:

{% highlight html %}
<script src="./path-to-library/xmpp-connector.min.js"></script>
<script>
  var connector = new XMPPConnector("my-awesome-roomname");
</script>
{% endhighlight %}


The XMPP-Connector will join a multi-user-chat room. The first connector that joins the chatroom will be the moderator. Every client that joins the chat room will synchronize with the moderator first, and henceforth publish changes to the multi-user-chat.

#####  Tips:

* Try to pick a random room name, so that it does not collide with another users room name. E.g. "efkdyjd0" - you can generate random room names like this: `(Math.random()+1).toString(36).substring(10)`
* In production, the first connector who logs into the chat room could be some server that manages state. It is easy to set up a nodejs server with Yatta.


### Create Yatta Object
Now, you can create your shared document.

{% highlight html %}
<script src="./path-to-library/yatta.js"></script>
<script>
  var yatta = new Yatta(connector);
</script>
{% endhighlight %}


That's it! Now you can work on your shared `yatta` object. It represents a JSON object, where every client can add, update, and delete object-properties.

##### Create Property

Create, or update property "name" with value "42":

{% highlight javascript %}
yatta.val("name",42)
console.log(yatta.val("name")) // => 42
{% endhighlight %}


Set an object as a property.

{% highlight javascript %}
yatta.val("object",{other_object: "hi there"})
console.log(yatta.val("object").val("other_object")) // => "hi there"
{% endhighlight %}

##### Delete Property
Delete the "object" property. If you have still references to this object, they will be unusable.

{% highlight javascript %}
yatta.delete("object")
{% endhighlight %}

##### Observe Changes
Every type in Yatta has its own bunch of events, to that you can listen to. All ObjectTypes can throw *add*, *update*, and *delete* events. The observe pattern in Yatta is very similar to [Object.observe](http://www.html5rocks.com/en/tutorials/es7/observe/?redirect_from_locale=de), an upcoming standard for observing changes on Javascript objects.

{% highlight javascript %}
yatta.observe(function(events){
  for(i in events){
    console.log("The following event-type was thrown: "+events[i].type)
    console.log("The event was executed on: "+events[i].name)
    console.log("This is the old value: "+events[i].oldValue)
    console.log("This is the new value: "+events[i].object)
  }
})
{% endhighlight %}


##### Tips:

* Sometimes you want your client to wait, until it is synchronized with all the other clients. Just call `connector.whenSynced(function(){console.log("synchronized")})`
* At all times, you can retrieve your shared document as a JSON object with `yatta.toJson()`

### Collaborative Text Area

When you collaborate on text, you should use the Yatta Word type, which handles mutable Strings (In general, Strings are not mutable in Javascript). The Word type has some convenient helpers, e.g. for binding it to an arbitrary input element:

{% highlight javascript %}
// create a mutable String/Word-Type
var mutable_string = yatta.val("mutable_string", "content", "mutable");

// get a textarea dom object
var textarea = document.querySelector("textarea");

// bind the mutable string to the textarea
mutable_string.bind(textarea)
{% endhighlight %}


<textarea id="shared-text" style="width: 100%;height:5em"></textarea>

### Polymer Elements

I want to make Yatta as easy as possible. When I [stumbled upon Polymer](https://plus.google.com/110297010634240861782/posts/FireNaHeDB6), I was amazed how it can be to create responsive and powerful applications with just a few linew of code.

<iframe width="560" style="max-width:100%" height="315" src="//www.youtube.com/embed/svfu9iQ8cyg" frameborder="0" allowfullscreen></iframe>

You can use Yatta and some of the Yatta-Connectors as a *custom element*.

<template>
  <yatta-element val={{yatta}}></yatta-element>
</template>
<paper-slider></paper-slider>


<hr>
What do **you** want to see next?


<script src="/_site/assets/bower_components/Yatta-Connectors/xmpp-connector/xmpp-connector.min.js"></script>
<script src="/_site/assets/bower_components/Yatta/yatta.js"></script>
<!--script src="/_site/assets/bower_components/webcomponentsjs/webcomponents.min.js"></script>
<link rel="import" href="/_site/assets/bower_components/polymer/polymer.html">
<link rel="import" href="/_site/assets/bower_components/Yatta/yatta-element.html">
<link rel="import" href="/_site/assets/bower_components/paper-slider/paper-slider.html"-->
<script>
var connector = new XMPPConnector("tutorial");
var yatta = new Yatta(connector);

connector.whenSynced(function(){
  if(yatta.val("shared_text") == null){
    yatta.val("shared_text","")
  }
  var textarea = document.querySelector("#shared-text")
  yatta.val("shared_text").bind(textarea)
  // document.querySelector("yatta-element").val = yatta;
});
</script>



