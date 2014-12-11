---
layout: yatta-page
title: About
permalink: /Yatta/
---

Yatta is a Real-Time web framework that manages concurrency control for arbitrary data structures.
Yatta! provides similar functionality as [ShareJs](https://github.com/share/ShareJS) and [OpenCoweb](https://github.com/opencoweb/coweb),
but does not require you to understand how the internals work. The predefined data structures provide a simple API to access your shared data structures.

Predefined data structures:
* Text - [Collaborative Text Editing Example](http://dadamonad.github.io/Yatta/examples/TextEditing/)
* Json - [Tutorial](http://dadamonad.github.io/Yatta/examples/PeerJs-Json/)
* XML - [XML Example](http://dadamonad.github.io/Yatta/examples/XmlExample/) Collaboratively manipulate the dom with native dom-features and jQuery.

Unlike other frameworks, Yatta! supports P2P message propagation and is not bound to a specific communication protocol.

It is possible to add any communication protocol to Yatta. Currently it supports:
* [PeerJs](http://peerjs.com/) - A WebRTC Framework
* [SimpleWebRTC](http://simplewebrtc.com/) - Another WebRTC Framework (coming soon)
* [IWC](http://dbis.rwth-aachen.de/cms/projects/the-xmpp-experience#interwidget-communication) - Inter-widget Communication

## Status
Yatta! is still in an early development phase. Don't expect that everything is working fine.
But I would become really motivated if you gave me some feedback :) ([github](https://github.com/DadaMonad/Yatta/issues)).

### Current Issues
* HTML editable tag
* More efficient representation of text.
* Use a better data structure for the History Buffer - it should be possible to use Arrays.
* SimpleRTC support


## Support
Please report _any_ issues to the [Github issue page](https://github.com/DadaMonad/Yatta/issues)!
I would appreciate if developers gave me feedback on how _convenient_ the framework is, and if it is easy to use. Particularly the XML-support may not support every DOM-methods - if you encounter a method that does not cause any change on other peers,
please state function name, and sample parameters. However, there are browser-specific features, that Yatta won't support.

## License
Yatta! is licensed under the [MIT License](./LICENSE.txt).

<kevin.jahns@rwth-aachen.de>



