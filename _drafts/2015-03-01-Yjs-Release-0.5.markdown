---
layout: post
title:  "Yjs Release 0.5"
date:   2015-03-01 00:56:45
description: Yjs Release 0.5
categories:
  - Yjs
---

* circular JSON


# Future Plans
These are some notes of what I plan to do in the next releases.

### Plans for the 0.5 Release
* Enable you to build custom data types without inspecting the Yjs code
* Further reduce the size of the messages that are sent
* Re-enabling XML as a custom data type

### Plans for the 0.6 Release
* Enable you to store operations in a database
  * The database is abstacted, so you can use IndexedDB (in the browser) or redis (on the server)
* Offline editing

### Plans for the 0.7 Release
* Undo
  * ... per textfield, per object, per type, per Yjs instance, ..
  * ... without breaking consistency of a data type
  * ... how can we use it in custom data types?
  * ... when offline
  * ... infinite undo
  * ... is contradictory with Garbage Collection. Find a way to solve this

### Plans for the 0.8 Release
* More ways to ensure consistency in custom data types.
  * Can be achieved by combining operations to a semantically consistent entity

### Plans for the 1.0 Release
* Make sure that the size of the messages is minimized as much as possible
* Write Yjs for other languages as well










