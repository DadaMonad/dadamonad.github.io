---
layout: yatta-page
title: Tutorial
permalink: /Yatta/tutorial/
---

This tutorial will give you a good idea on how you can work with Yatta. Explore the [examples](./examples/) and the [documentation](./documentation/) for more information.

Also, you are encouraged to do everything you find here in your browser console. Try to tinker with some of the examples you find here. If you have any problem, ask a question in the comments section at the bottom of this page.

### Yatta-Connectors
First of all, you have to define how you want your peers to connect to each other. You find a bunch of connectors in the [Yatta-Connector](https://github.com/DadaMonad/Yatta-Connectors) repository. Here, we create an XMPP-Connector:

{% highlight html %}
<script src="./path-to-library/xmpp-connector.min.js"></script>
<script>
  var connector = new XMPPConnector("my-awesome-roomname");
</script>
{% endhighlight %}


The XMPP-Connector will join a multi-user-chat room. The first connector that joins the chatroom will act as the moderator. Every new client that joins the chat room will synchronize with the moderator first, and henceforth publish changes to the XMPP multi-user-chat. When the moderator goes offline, new users are unable to synchronize. So you have to disconnect all clients that are currently in the room, and then the first user that joins the empty room is the moderator again.

#####  Tips:

* Try to pick a random room name, so that it does not collide with another users room name. E.g. "efkdyjd0" - you can generate random room names like this: `(Math.random()+1).toString(36).substring(10)`
* In production, the first connector who logs into the chat room could be some server that manages state. It is easy to set up a nodejs server with Yatta.
* You get the *ids* of all connected users with `connector.connections`.

##### Try it
Open you browser console, and create a connector:

{% highlight javascript %}
var connector = new XMPPConnector("some-random-room-name");
console.log(connector.connections) // retrieve the ids of all connected users
console.log(connector.role === "moderator") // true, if the connectors acts as a moderator
{% endhighlight %}

### Create Yatta Object
Now, you can create your shared document.

{% highlight html %}
<script src="./path-to-library/yatta.js"></script>
<script>
  var yatta = new Yatta(connector);
</script>
{% endhighlight %}


That's it! Now you can work on your shared `yatta` object. It represents a JSON object, where every client can *add*, *update*, and *delete* object-properties. Try to create a Yatta Object in your browser console and play with it. It is probably most fun if you create another Yatta Object in another browser window, so you can see life update in the other browser window.

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
    console.log("The event object has more information:")
    console.log(events[i])
  }
})
{% endhighlight %}


##### Tips:

* Sometimes you want your client to wait, until it is synchronized with all the other clients. Just call `connector.whenSynced(function(){console.log("synchronized")})`
* At all times, you can retrieve your shared document as a JSON object with `yatta.toJson()`

### Collaborative Text Area

When you collaborate on text, you should use the Yatta Word type, which handles mutable Strings (In general, Strings are not mutable in Javascript). The Word type has some convenient helpers, e.g. for binding it to an arbitrary input element. Try the following in your browser console.

{% highlight javascript %}
// create a mutable String/Word-Type
yatta.val("mutable_string", "content", "mutable");

// get the Word-Type
var mutable_string = yatta.val("mutable_string");

// get a textarea dom object
var textarea = document.querySelector("textarea");

// bind the mutable string to the textarea
mutable_string.bind(textarea)

console.log(mutable_string.val()) // => "content" - retrieve the current value

{% endhighlight %}

Now, the *mutable\_string* is bound to the *textarea*. This means that the *mutable\_string* is updated, when you type something in the *textarea*, and the *textarea* is updated when something is inserted into the *mutable\_string*

<textarea style="width: 100%;height:5em"> Please bind me :)</textarea>

### Polymer Elements

I want to make Yatta as easy as possible. When I [stumbled upon Polymer](https://plus.google.com/110297010634240861782/posts/FireNaHeDB6), I was amazed how it can be to create complex applications with just a few linew of code.

<!--div align="center">
<iframe width="560" style="max-width:100%" height="315" src="//www.youtube.com/embed/svfu9iQ8cyg" frameborder="0" allowfullscreen></iframe>
</div-->

Yatta as a *custom element* makes building collaborative applications _sooo_ easy. Just bind your shared values to the elements that you want to make collaborative.


{% highlight html %}
<link rel="import" href="/polymer/polymer.html">
<link rel="import" href="/Yatta/yatta-element.html">
<link rel="import" href="/Yatta-Connectors/xmpp-connector/xmpp-connector.html">
<link rel="import" href="/paper-slider/paper-slider.html">
<link rel="import" href="/paper-radio-group/paper-radio-group.html">

{% raw %}
<polymer-element name="yatta-polymer-binding" attributes="yatta connector">
  <template>
    <!-- First, create a connector-->
    <xmpp-connector connector={{connector}}></xmpp-connector>

    <!-- Bind the connector to the yatta-element -->
    <yatta-element connector={{connector}} val={{yatta}}>
      <!-- The yatta-elements exports the yatta object (similar to that one we created with pure Javascript). -->
      <!-- We can access its properties with the yatta-property tag -->
      <yatta-property name="slider" val={{slider}}></yatta-property>
      <yatta-property name="radio" val={{radio}}></yatta-property>
    </yatta-element>

    <!-- Now, we can bind the properties to arbitrary custom elements -->
    <paper-radio-group selected={{radio}}>
      <paper-radio-button name="nice" label="Nice"></paper-radio-button>
      <paper-radio-button name="great" label="Great"></paper-radio-button>
      <paper-radio-button name="awesome" label="Awesome"></paper-radio-button>
    </paper-radio-group>
    <paper-slider min="0" max="200" immediateValue={{slider}}></paper-slider>
  </template>
  <script>
  Polymer({
  })
  </script>
</polymer-element>
{% endraw %}

{% endhighlight %}


<elements-showoff></elements-showoff>

Try to make the polymer elements above collaborative by putting the following code in your browser console:

{% highlight javascript %}

var custom_element = document.querySelector("elements-showoff");

// The elements-showoff tag expects an val attribute.
// Then, the elements-showoff element binds val to a yatta-element.
custom_element.val = yatta;

{% endhighlight %}

Manipulate the values of the *yatta* object, and observe the live changes of the custom element.

<hr>
What do **you** want to see next?


<script src="{{ site.baseurl }}bower_components/Yatta-Connectors/xmpp-connector/xmpp-connector.js"></script>
<script src="{{ site.baseurl }}bower_components/Yatta/yatta.js"></script>
<link rel="import" href="{{ site.baseurl }}elements/elements-showoff.html">

<!--script>
var connector = new XMPPConnector("tutorial");
var yatta = new Yatta(connector);
connector.whenSynced(function(){
  if(yatta.val("shared_text") == null){
    yatta.val("shared_text","")
    yatta.val("slider",39)
  }
  var textarea = document.querySelector("#shared-text")
  yatta.val("shared_text").bind(textarea)
  var ce = document.querySelector("elements-showoff");
  ce.val = yatta
  // document.querySelector("yatta-element").val = yatta;
});
</script-->
