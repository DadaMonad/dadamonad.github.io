---
layout: y-page
title: About
#permalink: /
---
Yjs is a framework for optimistic concurrency control and automatic conflict resolution on arbitrary data types. The framework implements a new OT-like concurrency algorithm and provides similar functionality as [ShareJs] and [OpenCoweb]. Yjs was designed to handle concurrent actions on arbitrary complex data types like Text, Json, and XML. You can find some applications for this framework [here](http://y-js.org/examples/).

You can create your own shared data types easily. Therefore, you can take matters into your own hand by defining the meaning of the shared types and ensure that it is valid, while Yjs ensures data consistency (everyone will eventually end up with the same data).
You can use existing types in your custom data type as well. Learn in [this wiki page](https://github.com/y-js/yjs/wiki/Custom-Types) how to craft your own custom data types. We already provide data types for

| Name                                                 | Description
| ---------------------------------------------------- | ---------------------------------------------
y-object | Add, update, and remove properties of an object. Circular references are supported. Included in Yjs
[y-list](https://github.com/y-js/y-list) | A shared linked list implementation. Circular references are supported
[y-selections](https://github.com/y-js/y-selections) | Manages selections on types that use linear structures (e.g. the y-list type). You can select a range of elements and assign meaning to them.
[y-xml](https://github.com/y-js/y-xml) | An implementation of the DOM. You can create a two way binding to Browser DOM objects
[y-text](https://github.com/y-js/y-text) | Collaborate on text. You can create a two way binding to textareas, input elements, or HTML elements (e.g. *h1*, or *p*)
[y-richtext](https://github.com/y-js/y-richtext) | Collaborate on rich text. You can create a two way binding to several editors

Unlike other frameworks, Yjs supports P2P message propagation and is not bound to a specific communication protocol. Therefore, Yjs is extremely scalable and can be used in a wide range of application scenarios.

We support several communication protocols as so called *Connectors*. You can create your own connector too - read [this wiki page](https://github.com/y-js/yjs/wiki/Custom-Connectors). Currently, we support the following communication protocols:

Name                                     | Description
---------------------------------------- | -------------------------------------------------------
[y-xmpp](https://github.com/y-js/y-xmpp) | Propagate updates in a XMPP multi-user-chat room ([XEP-0045](http://xmpp.org/extensions/xep-0045.html))
[y-webrtc](https://github.com/y-js/y-webrtc) | Propagate updates Browser2Browser via WebRTC
[y-test](https://github.com/y-js/y-test) | A Connector for testing purposes. It is designed to simulate delays that happen in worst case scenarios


You can use Yjs client-, and server- side. You can get it as via npm, and bower. We even provide polymer elements for Yjs!

The advantages over similar frameworks are support for
* .. P2P message propagation and arbitrary communication protocols
* .. arbitrary complex data types
* .. offline editing: Only relevant changes are propagated on rejoin (unimplemented)
* .. AnyUndo: Undo *any* action that was executed in constant time (unimplemented)
* .. Intention Preservation: When working on Text, the intention of your changes are preserved. This is particularily important when working offline. Every type has a notion on how we define Intention Preservation on it.


# Status
Yjs is a work in progress. Different versions of the *y-* repositories may not work together. Just drop me a line if you run into troubles.

## Get help
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/y-js/yjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Please report _any_ issues to the [Github issue page](https://github.com/y-js/yjs/issues)! I try to fix them very soon, if possible.

## Contribution
I created this framework during my bachelor thesis at the chair of computer science 5 [(i5)](http://dbis.rwth-aachen.de/cms), RWTH University. Since December 2014 I'm working on Yjs as a part of my student worker job at the i5.

## License
Yjs is licensed under the [MIT License](./LICENSE.txt).

[ShareJs]: https://github.com/share/ShareJS
[OpenCoweb]: https://github.com/opencoweb/coweb

<yjs@dbis.rwth-aachen.de>
