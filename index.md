---
layout: y-page
title: About
#permalink: /
---

Yjs is a framework for optimistic concurrency control and automatic conflict resolution on arbitrary data types. The framework implements a new OT-like concurrency algorithm and provides similar functionality as [ShareJs] and [OpenCoweb]. Yjs was designed to take away the developer overhead from concurrently editing complex data types like Text, Json, and XML. Moreover, it has a modular design and can be easily embedded into existing Web applications. You can find some simple demos with the framework in action [here](https://dadamonad.github.io/yjs/examples).

Yjs enables users to implement their own collaborative types. Currently we provide data types for
* Text
* Json
* XML 

Unlike other frameworks, Yjs supports P2P message propagation. Also, it is not bound to a specific communication protocol. Therefore, Yjs is extremely scalable and can be used in a wide range of application scenarios.

We support several communication protocols as so called *Connectors*. You can create your own connector too - as it is described [here](https://dadamonad.github.io/yjs/connector/Howto-create-your-own-Connector.html). Currently, we support the following communication protocols:
* [XMPP-Connector](http://xmpp.org) - Propagates updates in a XMPP multi-user-chat room
* [WebRTC-Connector](http://peerjs.com) - Propagate updates directly with WebRTC
* [IWC-Connector](http://dbis.rwth-aachen.de/cms/projects/the-xmpp-experience#interwidget-communication) - Inter-widget Communication

You can use Yjs client-, and server- side. You can get it as via npm, and bower. Please note that a polymer element for Yjs is also available!

Some advantages for adopting Yjs over similar frameworks are support for
* .. P2P message propagation and arbitrary communication protocols
* .. arbitrary complex data types
* .. offline editing: Only relevant changes are propagated on late join (unimplemented)
* .. AnyUndo: Undo *any* action that was executed in constant time (unimplemented)
* .. Intention Preservation: When working on Text, the intention of your changes are preserved. This is particularily important when working offline.

## Status
Yjs is still in an early development phase. We are always welcoming feedback or contributions! :)

### Current Issues
* The History Buffer should be able to store operations in a database
* Documentation

## Get help
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/y-js/yjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Please report _any_ issues to the [Github issue page](https://github.com/rwth-acis/yjs/issues)! I try to fix them very soon, if possible.

## Contribution
Yjs was created by the Advanced Community Informations Systems Group (ACIS), Chair of Information Systems and Databases [(i5)](http://dbis.rwth-aachen.de/cms), RWTH Aachen University, Germany. The initial algorithm and framework implementation were developed within Kevin Jahns's Bachelor Thesis: (http://dbis.rwth-aachen.de/cms/theses/NRT_Collaboration_Framework)


## License
Yjs is licensed under the [MIT License](./LICENSE.txt).

[ShareJs]: https://github.com/share/ShareJS
[OpenCoweb]: https://github.com/opencoweb/coweb

<yjs@dbis.rwth-aachen.de>

