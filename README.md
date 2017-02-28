# RAML Types Bindings


This repository contains experimental functionality devoted to the following things:


a) provide data binding facilities for instances basing on a knowledge of their RAML type original web location, CRUD

b) provide and explorer various kinds of metadata associated with instances that are generally useful. (for example how to 
compute label for an instance, or how to convert instance of type A to instance of type B)


Code here is very experimental and dirty! And is precious for me as a memory. Refactoring will be performed as soon as initial exploration round trip will be finished.



For now common use cases might be something like this
 
 * `tps.service.compare(i1,i2,t)`
 * `tps.service.label(i,t)`

But generally I would not recomend to use this code or read it at this moment.