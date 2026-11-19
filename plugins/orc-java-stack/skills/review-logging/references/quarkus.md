# Logging rules for Quarkus services

1. **Large objects use `kv()`.** A large object (a request or response body, a top-level DTO) goes
    in as `kv("name", object)`
    (`import static io.quarkiverse.loggingjson.providers.KeyValueStructuredArgument.kv;`). It needs
    no `{}`, and the line above the call is
    `//noinspection LoggingPlaceholderCountMatchesArgumentCount`. Never use `kv()` for a simple value
    such as an id. Never serialize the object yourself: `kv()` does it.

    ```java
    //noinspection LoggingPlaceholderCountMatchesArgumentCount
    log.info("Processing transaction, transactionId: {}", transactionId, kv("transaction", transactionDto));
    ```
