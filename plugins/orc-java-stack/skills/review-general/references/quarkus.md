# General rules for Quarkus services

1. **Classes deserialized outside a REST resource are registered for reflection.** Only in a service
    that builds a native image: `pom.xml` has a `native` profile or sets `quarkus.native` properties.
    A class that Jackson reads outside a REST resource (a Pub/Sub DTO, a REST client response) needs
    `@RegisterForReflection`, or must be listed in a central `@RegisterForReflection(targets = …)`
    class. Without it, the native image fails only at runtime, in production. A missing registration
    is Fix.
