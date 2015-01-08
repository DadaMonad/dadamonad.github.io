---
layout: yatta-page
title: About
permalink: /Yatta/
---

Yatta is a Real-Time web framework that manages concurrency control for changes on arbitrary data types. Yatta provides similar functionality as [ShareJs] and [OpenCoweb], but does not require you to understand how the internals work. 

Predefined data types:
* Text - [Collaborative Text Editing Example](http://dadamonad.github.io/Yatta/examples/TextEditing/)
* Json - [Tutorial](http://dadamonad.github.io/Yatta/examples/PeerJs-Json/)
* XML  - [XML Example](http://dadamonad.github.io/Yatta/examples/XmlExample/) Collaboratively manipulate the dom with native dom-features and jQuery.

Unlike other frameworks, Yatta supports P2P message propagation and is not bound to a specific communication protocol. 

Currently supported communication protocols:
* [PeerJs](http://peerjs.com/) - A WebRTC Framework
* [SimpleWebRTC](http://simplewebrtc.com/) - Another WebRTC Framework (coming soon)
* [IWC](http://dbis.rwth-aachen.de/cms/projects/the-xmpp-experience#interwidget-communication) - Inter-widget Communication

You can use Yatta client, and server side. You can get it as via npm, bower, and CDN. We even provided a polymer element for Yatta. 

## Status
Yatta! is still in an early development phase. Don't expect that everything is working fine.
But I would become really motivated if you gave me some feedback :)

## Support
Please report _any_ issues to the [Github issue page](https://github.com/DadaMonad/Yatta/issues)! I would appreciate if developers gave me feedback on how _convenient_ the framework is, and if it is easy to use. Particularly the XML-support may not support every DOM-methods - if you encounter a method that does not cause any change on other peers, please state function name, and sample parameters. However, there are browser-specific features, that Yatta won't support.

## License
Yatta! is licensed under the [MIT License](./LICENSE.txt).

[ShareJs]: https://github.com/share/ShareJS
[OpenCoweb]: https://github.com/opencoweb/coweb
