---
layout: y-page
title: About
permalink: /yjs/
---

yjs is a framework for optimistic concurrency control and automatic conflict resolution on arbitrary data types. The framework implements a new OT-like concurrency algorithm and provides similar functionality as [ShareJs] and [OpenCoweb]. yjs was designed to take away the pain from concurrently editing complex data types like Text, Json, and XML. You can find some applications for this framework [here](https://dadamonad.github.io/yjs/examples/).

In the future, we want to enable users to implement their own collaborative types. Currently we provide data types for
* Text
* Json
* XML

Unlike other frameworks, yjs supports P2P message propagation and is not bound to a specific communication protocol. Therefore, yjs is extremely scalable and can be used in a wide range of application scenarios.

We support several communication protocols as so called *Connectors*. You find a bunch of Connectors in the [y-connectors](https://github.com/rwth-acis/y-connectors) repository. Currently supported communication protocols:
* [XMPP-Connector](http://xmpp.org) - Propagates updates in a XMPP multi-user-chat room
* [WebRTC-Connector](http://peerjs.com/) - Propagate updates directly with WebRTC
* [IWC-Connector](http://dbis.rwth-aachen.de/cms/projects/the-xmpp-experience#interwidget-communication) - Inter-widget Communication

You can use yjs client-, and server- side. You can get it as via npm, and bower. We even provide a polymer element for yjs!

The theoretical advantages over similar frameworks are support for
* .. P2P message propagation and arbitrary communication protocols
* .. arbitrary complex data types
* .. offline editing: Only relevant changes are propagated on rejoin (unimplemented)
* .. AnyUndo: Undo *any* action that was executed in constant time (unimplemented)
* .. Intention Preservation: When working on Text, the intention of your changes are preserved. This is particularily important when working offline.

## Status
yjs is still in an early development phase. Don't expect that everything is working fine. But I would become really motivated if you gave me some feedback :)

### Current Issues
* The History Buffer should be able to store operations in a database
* Documentation
* Reimplement support for XML as a data type
* Custom data types

## Support
Please report _any_ issues to the [Github issue page](https://github.com/DadaMonad/yjs/issues)!
I would appreciate if developers give me feedback on how _convenient_ the framework is, and if it is easy to use. Particularly the XML-support may not support every DOM-methods - if you encounter a method that does not cause any change on other peers, please state function name, and sample parameters. However, there are browser-specific features, that yjs won't support.

## License
yjs is licensed under the [MIT License](./LICENSE.txt).

[ShareJs]: https://github.com/share/ShareJS
[OpenCoweb]: https://github.com/opencoweb/coweb

<kevin.jahns@rwth-aachen.de>

