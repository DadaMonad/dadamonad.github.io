---
layout: y-page
title: Tutorial
permalink: /tutorial/
---

This tutorial will give you a good idea on how you can work with Yjs. For detailed instructions on the components that are described here, check the respective repositories. You find a list of all the Yjs modules, and more information about Yjs in the [github wiki](https://github.com/y-js/yjs/wiki).

Furthermore, you are encouraged to try out everything you find here in your browser console. Try to tinker with some of the examples. If you have any problem, ask a question in the comments section at the bottom of this page.

### Connectors
First of all, you have to define how you want your peers to connect to each other. Therefore, we introduce the concept of *connectors*. The connector is the interface that defines how your clients communicate with each other. The cool thing in Yjs is, that you can simply interchange different connectors. Therefore, you can switch from the XMPP connector to the WebRTC connector by changing only a few lines of code. In this tutorial we will use the XMPP connector. But you should check out the WebRTC connector too - it is really fast!

{% highlight html %}
<script src="./y-xmpp/y-xmpp.js"></script>
<script>
  var options = {}; // use default settings
  // Connect to our testing server, and join an XMPP multi user chat room.
  var connector = new Y.XMPP(options).join("my-awesome-roomname");
</script>
{% endhighlight %}

[The XMPP connector](https://github.com/y-js/y-xmpp) defines how to exchange updates through an XMPP multi-user-chat room ([XEP-0045](http://xmpp.org/extensions/xep-0045.html)). If you don't specify the `options` object, then Y.XMPP will connect to an XMPP server that we provide. Open now your browser console, and create a connector.

#####  Tips:

* Try to pick a random room name, so that it does not collide with another users room name. E.g. "efkdyjd0" - you can generate random room names like this: `(Math.random()+1).toString(36).substring(10)`
* Yjs and its modules do also work with [Node.js](https://nodejs.org/). Therefore, you can use the same code both on client and server side.
* You get the *ids* of all connected users with `connector.connections`. (works only *after* you bound the connector to an instance of Y)

### Create a shared document
Now, you can create your shared document, which is an instance of Y (because it is created with the *new* operator). All the changes on the instance of Y will be instantly propagated to the other peers.

{% highlight html %}
<script src="./yjs/y.js"></script>
<script>
  var y = new Y(connector);
</script>
{% endhighlight %}

'y' will inherit all the functionality of the *Y.Object* class. So the following section will apply to it.

## Y.Object
In the Yjs project, we strongly distinguish between *data type* and *data structure*. Yjs knows how to handle concurrency on several data structures like HashMaps, Trees, Lists and Graphs. You can create arbitrary complex data types with them. In the [wiki](https://github.com/y-js/yjs/wiki) we list a bunch of types that you can include in your project, and we show you how to create your own types.

The y-object types is the only type that is included in Yjs. It represents a Javascript object, where you can *add*, *update*, and *delete* object-properties. You can even create circular structures, if you want.

##### Set, and Delete Properties

Add, or update property "name" with value "42":

{% highlight javascript %}
// set a property
y.val("name",42)
// retrieve a property
console.log(y.val("name")) // => 42
// retrieve all properties of y
console.log(y.val()) // => {name: 42}
{% endhighlight %}

You can set arbitrary objects on a y-object. Just make sure, that it is possible to convert them to a string (e.g. with 'JSON.stringify'). You can create a new Y.Object like this:

{% highlight javascript %}
y.val("myobj", new Y.Object({some_initial_content: "hi there"}))
console.log(y.val("myobj").val()) // => {some_initial_content: "hi there", new: "string"}
{% endhighlight %}

Delete the "name" property.

{% highlight javascript %}
y.delete("name")
{% endhighlight %}

##### Observe Changes
Every type has its own bunch of events that you can listen to. All y-objects can throw *add*, *update*, and *delete* events. The observe pattern in Yjs is very similar to [Object.observe](http://www.html5rocks.com/en/tutorials/es7/observe/?redirect_from_locale=de), an upcoming standard for observing changes on Javascript objects.

{% highlight javascript %}
y.observe(function(events){
  for(i in events){
    console.log("The following event-type was thrown: "+events[i].type)
    console.log("The event was executed on: "+events[i].name)
    console.log("The event object has more information:")
    console.log(events[i])
  }
})
{% endhighlight %}


##### Tips:
* Use *tab+enter* to enter the previous code into your browser console
* Sometimes you want your client to wait, until it is synchronized with all the other clients. Just call `connector.whenSynced(function(){console.log("synchronized")})`
* Read the documentation of the y-object type on the [github repository](https://github.com/y-js/yjs#yobject)

## Y.List

You can manage lists with this type. In order to use this type you have to include the y-list library. Learn more about this type [here](https://github.com/y-js/y-list).

##### Insert / Delete Elements

Create a new Y.List:
{% highlight javascript %}
y.val("list", new Y.List([1,2,3]))
{% endhighlight %}

and apply changes to it
{% highlight javascript %}
var list = y.val("list");
// insert 4 at position 3
list.insert(3,4)
// retrieve an element
console.log(list.val(3)) // => 4
// retrieve the list as an array
console.log(list.val()) // => [1,2,3,4]
{% endhighlight %}

Y.List throws *insert* and *delete* events. Set an observer on the `list` and repeat the previous example.

## Collaborative Text Area
In order to create a collaborative textarea, you can use the [y-text](https://github.com/y-js/y-text) type. It has some convenient helpers, e.g. for binding it to an arbitrary input element. Try the following in your browser console.

{% highlight javascript %}
// create a y-text instance
y.val("text", new Y.Text("content"));

// get the Word-Type
var text = y.val("text");

// get a textarea dom object
var textarea = document.querySelector("textarea");

// bind the mutable string to the textarea
text.bind(textarea)

console.log(text.val()) // => "content" - retrieve the current value

{% endhighlight %}

Now, the `text` is bound to the `textarea`. This means that the `text` is updated, when you type something in the `textarea`, and the `textarea` is updated when something is inserted into the `text`. This is also known as *two way binding*.

<textarea style="width: 100%;height:5em"> Please bind me :)</textarea>

### Polymer Elements

I want to make Yjs as easy as possible. When I [stumbled upon Polymer](https://plus.google.com/110297010634240861782/posts/FireNaHeDB6), I was amazed how easy it can be to create complex applications with just a few lines of code.

<!--div align="center">
<iframe width="560" style="max-width:100%" height="315" src="//www.youtube.com/embed/svfu9iQ8cyg" frameborder="0" allowfullscreen></iframe>
</div-->

Yjs as a *custom element* makes building collaborative applications _sooo_ easy. Just bind your shared values to the elements that you want to make collaborative.


{% highlight html %}
<link rel="import" href="/polymer/polymer.html">
<link rel="import" href="/y-connectors/y-xmpp/y-xmpp.html">
<link rel="import" href="/y/y-object.html">
<link rel="import" href="/paper-slider/paper-slider.html">
<link rel="import" href="/paper-radio-group/paper-radio-group.html">

{% raw %}
<polymer-element name="y-polymer-binding" attributes="y connector">
  <template>
    <!-- First, create a connector-->
    <xmpp-connector connector={{connector}}></xmpp-connector>

    <!-- Bind the connector to the y-object -->
    <y-object connector={{connector}} val={{y}}>
      <!-- The y-object exports an instance of Y (similar to that one we created with pure Javascript). -->
      <!-- We can access its properties with the y-property tag -->
      <y-property name="slider" val={{slider}}></y-property>
      <y-property name="radio" val={{radio}}></y-property>
    </y-object>

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
// Then, the elements-showoff element binds val to a y-object.
custom_element.val = y;

{% endhighlight %}

Manipulate the values of the *y* object, and observe the live changes of the custom element.

<hr>
What do **you** want to see next?


<script src="{{ site.baseurl }}bower_components/yjs/y.js"></script>
<script src="{{ site.baseurl }}bower_components/y-list/y-list.js"></script>
<script src="{{ site.baseurl }}bower_components/y-text/y-text.js"></script>
<script src="{{ site.baseurl }}bower_components/y-selections/y-selections.js"></script>
<script src="{{ site.baseurl }}bower_components/y-xml/y-xml.js"></script>
<script src="{{ site.baseurl }}bower_components/y-xmpp/y-xmpp.js"></script>
<script src="{{ site.baseurl }}bower_components/y-webrtc/y-webrtc.js"></script>
<link rel="import" href="{{ site.baseurl }}elements/elements-showoff.html">

<!--script>
var connector = new Y.XMPP().join("tutorial");
var y = new Y(connector);
connector.whenSynced(function(){
  if(y.val("text") == null){
    y.val("text","")
    y.val("slider",39)
  }
  var textarea = document.querySelector("#shared-text")
  y.val("text").bind(textarea)
  var ce = document.querySelector("elements-showoff");
  ce.val = y
  // document.querySelector("y-object").val = y;
});
</script-->
