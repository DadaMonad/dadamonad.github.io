
# Connector-Interface
The idea is, to create different implementations of the Connector interface that enable communication within a group.
It has a minimal interface and covers some frequently occuring problems thay you probably will encounter if you use communitcation protocols directly.

Check out the [website](https://dadamonad.github.io/yjs/) for more information.

E.g. You can exchange the PeerJs-Connector with the XMPP-Connector only by changing few lines of code.

It is the communication interface used by [yjs](https://github.com/rwth-acis/yjs).

Currently we have interfaces for:
* PeerJs
* XMPP
* Testing

More information about the Connector interface will follow. (Trust the update frequency, this could be a lie)
