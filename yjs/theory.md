---
layout: y-page
title: Theory
permalink: /yjs/theory/
---
Find out more about the concurrent editing problem here
[Cooperation, Concurrency, Conflicts, and Convergence](http://opencoweb.org/ocwdocs/intro/openg.html) and here
[Operational Transformation (OT)](http://en.wikipedia.org/wiki/Operational_transformation)

My Bachelor Thesis project aim was to develop a P2P OT Framework that enables collaboration on XML documents and supports
[Intention Preservation](http://www3.ntu.edu.sg/home/czsun/projects/otfaq/#intentionPreservation).
After some time I realized that OT has significant drawbacks in P2P environments.

With my gained experiences I came up with a new approach. I named it *YATA* - Yet Another Transformation Approach.
It enables concurrent editing with the following space and time properties:
* Time complexity: $$O(S)$$, where $$S$$ is the number of operations that are inserted concurrently at the same position (no transformation against operations that happen on different positions).
* Space complexity = $$O(|Document|)$$, where $$|Document|$$ is the size of the shared document.
 
This means that my approach beats all OT time complexities. Furthermore, YATA has a very strict definition of Intention Preservation, and I was able to
show that it is never violated.

Another advantage of YATA is that propagated messages are very small.
Background: In Real-Time P2P OT algorithms you have to send a state-vector with each message that defines the state of the History Buffer
on which the operation was created. This is not necessary in YATA.

The downside of this approach is that the History Buffer holds at least as many operations as there are characters in the document.
In contrast, an OT algorithm can have an empty History Buffer while the document size is very big.

Eventually (after I published my paper), I will provide more information about YATA.
