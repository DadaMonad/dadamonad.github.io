---
layout: post
title:  "Visions in Real Time Communication"
date:   2015-01-14 23:56:45
description: Stuff
categories:
- blog
permalink: real-time-visions
---

 concurrency control
  Automatic Conflict Resolution
  Real Time
  eventual data consistency
  peer to peer

## Why
 * OT no P2P
 * offline, sync
 * 


## Visions
* offline first


### Asynchronous Communication vs. Synchronous Communication
  * Asynchronous Communication should not mean not Real Time
  * added RT to mail, and  it was good
  * "" to stack overflow, and it was good
  * "" to g+, and yeah, this was not necessary, but cool and enhances interaction
  * + enhancing interaction!

  * I would really like to see more applications to update their view immediately, when another user creates content
 * configurations update RT
  * when changing the model, update the view

 * You have more than one computing device to visualize your data.
  * WriteLatex (Overleaf)
  * View update in Real time
   * First idea: xml -> transformation to HTML/Whatever
   * Nice field of application for polymer elements, angular and similar frameworks that use data binding
   * If possible, use Cross-tab communication. The user won't notice _any_ delay

### Decentralisation
 * XMPP connector
  * Nice thing about XMPP: they already solved a lot of problems, that are also relevant in for us.
   * Permission
   * Feature discovery
   * Login / Authentication
   * Federated per default
   * efficient data transfer

  * Share documents on your own computer and Home Server. No centralization (something like Dropbox, but better)
    * peace of cake to create a storage system with Yatta. Devices p2p file transfer
    
#### Services participate in collaboration
  * We have high end computers, but we use the capacity only a short amount of time
  * compiling and other tasks are slow
   * Compiling as a Service
  * in XMPP connector: A server is just another client
  * There should be several connectors for different scenarios
   * For security reasons you want a p2p infrastructure, or at least federated
   * Use any pubsub implementation like Pusher.com, or redis pubsub - whatever fits your needs.
   * Fits well into the existing infrastructures.
   * Email Connector :)

### Persistent redundant storage
 * Save stuff in browser database
  * [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  * Offline editing
  * Server does not have to send the whole document to the user
   * no downtimes for the client
   * data replication among all participating clients, and (if necessary) also several servers

### Data Types
  * In OT: Hard to implement complex data structures and it needs an expert to do this.
   * How long did it take ShareJS to implement support for Rich text?
  * Currently only a few supported data types
  * Yatta supports all data structures
   * How to enable users/developers to develop their own types, that have special properties

##### Intention Preservation in OT is a lie
   * loosely defined
   * example
   * How yatta defines it
   * intention on Trees Sentences
   * intention on Code
   * Unsolved Problems:
    * Concurrent editing on the same data type, can lead to semantic, or logical inconsistencies. In some cases, you can use custom data types in order ensure that your data is always consistent. But I'm sure that there are special constellations, when this is going to be very hard to achieve.

### Alternative to REST Services
  * REST is an antipattern for RT applications
  * Submitting forms
   * Go from one device, to another device
  * Sevianno example (video list, annotations)
   * Each time, a database query (in O(log(n)))
  * Server does not have to handle requests, just the transformation of data. The client receives small updates.
  * Clients receive updates, even if the server is under stress

### Simplicity
 * OpenCoweb
  * Fine algorithm
  * It needs an expert to use it.
  * Experimented with js getter and setters
  * Therefore, I want to make the API as simple as possible. It should feel like just using json Objects. In fact, if your browser supports Object.Observe, you can do just that: Export yatta as a Json object, Yatta listens to changes (with Object.Observe) and propagates the updates to all users, and Yatta throws events on the Json Object, when it changes.
  * Great: Several server implementations
   * Better: Client and Serve use the same transformation algorithm.
   * Not to fancy implementation. It uses Object orientation with simple inheritance (inherit only from one parent). Adoption in several Programming languages, as soon as the reference implementation is ready.
   * Currently you can use NodeJs. But Optimistic Concurrency Control has a wide area of application, and could be used as a more efficient alternative than locking (e.g. in super computing). It would be nice to see Yatta in super computing. For example as a more efficient alternative to locking.














