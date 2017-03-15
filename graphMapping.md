# Reconstructing classes from REST endpoints

##### Functional notation

It is always possible to represent a REST methods as a function with input and output `f(input)=>output`,
where input and output can be deconstructed to smaller variables with a particular types.

In the future let's use following notation `f(a,b,c)=>(d,e)`  to represent REST methods in abstract way.

Some of this parameters can be represented as an entities of particular types. Lets use colon notation to represent 
this: `f(a:Person,b:integer,c:integer)=>(d:Person)`

##### Pointer(reference) types

No let's introduce the notation of pointer(reference) types.  

Pointer types are the types with a following additional constraint on values: each value of the type can be mapped
on an instance of a pointed type and back. 

Let's distinguish two sub sets of pointer types, full pointer types and partial pointer types.

Full pointer types, are the types who's instances has group isomorhpism with an instances of pointed type
(In other words has one to one correspondens with an instances of pointed type). Lets use `&` in a front 
of pointed type name to distinguish full pointer types `(&Repository)` = full pointer type to a instances of Repository

Partial pointer types does not have enough information to be mapped to an instance of a pointed type in a isomorphic way
on its own, however for each instance of pointed type there is a way to get an instance of pointer type and in 
some subspace of pointed types there is a isomorphic transformation of pointer instances to pointer types.

This subspace should be clearly defined by the function parameters that are used before this kind of pointer type
(*TODO rephrase*). In other form we may name this parameters as a parent keys.

Lets use `*` in a front 
of pointed type name to distinguish partial pointer types `(*Ticket)` = partial pointer type to a instances of Ticket type


Now lets view a following function

`f(r:&Repository,i:*Ticket)=>(d: TicketDescription)` 

In this case once value of `r`
parameter is fixed, partial pointer to the ticket type may be viewed as a full pointer and the function can be specialised as `f(i:&Ticket)=>(d:TicketDescription)`

##### Computable parameters:

Let's go back to our original function `f(r:&Repository,i:*Ticket)=>(d:TicketDescription)` 
And then lets say that we have a way to calculate `r`, from an instance of Ticket, in this case once we
have an instance of ticket we can caluclate values of all function parameters so we can build a function which maps 
instance of ticket to ticket descriptions

`f(c:Ticket)=>(d:TicketDescription)`

