---
name: clean-code-java
description: Use when editing .java files or when Java, Spring Boot, JPA, Maven or JUnit are part of the task. The Java shape of the clean-code rules, with the layer defaults for a Spring service and the per-layer smells that no linter catches. Also read by the orchestra clean-code gate.
---

# Clean Code — Java and Spring

The Java and Spring shape of the clean-code rules. The `clean-code` skill,
or the clean-code gate of orchestra, owns the process; whichever loaded this
skill keeps it. A finding cites `Java rule <n>` and `file:line`. A rule that
`javac`, Checkstyle, PMD, SpotBugs or Error Prone checks is not repeated
here. Where one of them borders a rule, the rule names the tool. In an
orchestra run, exceptions and argument checks are the ops gate's job, tests
the testing gate's, comments the comments gate's, and static helper classes
the layout gate's. "Gate rule 11", "12" and "13" are the orchestra gate's rules for a core
that works without the UI and the IO, dependencies that point inward, and a
simple typed value at a boundary. In the standalone `clean-code` skill they
are Phases 1, 2 and 3 of `architecture.md`.

The project's `CLAUDE.md` or `AGENTS.md` outranks every default here.

## Rules

1. **A class name is a noun, a method name is a verb.** `OrderPricing`, `findOverdueLoans()`. A
   bare `Manager`, `Processor`, `Helper`, `Data` or `Info` names no job: add the domain word, or
   split the class. The case conventions (`PascalCase` types, `camelCase` members, `UPPER_SNAKE`
   constants) are Checkstyle's naming checks; the project turns them on.
2. **An implementation is named for what makes it different.** `JpaOrderRepository`,
   `StripePaymentGateway`. When there is only one implementation, `Default<Interface>`. `Impl` only
   when the project already uses it. An interface with one implementation and no second one in
   sight is not needed: use the class.
3. **Arguments that travel together are a `record`.** The clean-code rules allow at most three parameters.
   A `record` is the parameter object; a builder only when most of its fields are optional. Never
   a `Map<String, Object>` of arguments.
4. **No flag arguments.** A `boolean` that picks a path is two methods. When the choice is part of
   the data and a third case is likely, it is an `enum`.
5. **Sealed types, not type codes.** A `String` or `enum` field that a `switch` or an `instanceof`
   chain reads in more than one place is a sealed interface, with a `record` for each case, read by
   one pattern `switch`. Write that `switch` with no `default`: then `javac` reports the case a new
   type forgets.
6. **No `null` for "nothing".** A method that returns a collection returns an empty one. `Optional`
   is a return type only: never a field, a parameter or a collection element.
7. **Dependencies come through the constructor.** Collaborators are `private final` fields, set
   by the constructor (`@RequiredArgsConstructor` when the project uses Lombok). No `@Autowired`
   on a field, and no `new` of a collaborator inside a service: the test cannot replace it.
8. **A JPA entity stays behind the service.** A controller takes and returns a DTO (a `record`),
   never an `@Entity`. A domain function takes a `record` or values, not an entity, unless the
   project's entities are its domain model. This is gate rule 13 in Java.
9. **A lambda is one line.** A lambda with a branch, or longer than three lines, is a named private
   method and a method reference. Its branches count toward the method around it. `map` and
   `filter` have no side effects. A `forEach` that adds to a list outside it is a `collect` or
   `toList()`.
10. **A suppression has the smallest scope and its reason.** `@SuppressWarnings` goes on the local
    variable or the method, never on the class, with a comment that says why the check is wrong
    here. The same for `// NOSONAR` and `// NOPMD`. The measurement counts each one.

## Layers of a Spring service

The project's `AGENTS.md` or `CLAUDE.md` overrides these names. It may group by feature
(`<feature>/{web,service,domain,persistence}`) instead of by layer; the arrows hold either way.

```
web/          @RestController classes and their request and response records; translate, never decide
service/      one use case per public method; @Transactional here; returns records or domain types
domain/       the rules: records, sealed types, plain classes; no Spring, no JPA, no HTTP
persistence/  @Entity classes and Spring Data repositories; the mapping to and from domain types
client/       adapters to other services; their wire types stay here
config/       @Configuration and properties records
```

The direction: `web` imports `service`; `service` imports `domain`, `persistence` and `client`;
`persistence` and `client` import `domain`; `domain` imports nothing above it; nothing imports
`web`. When the project has ArchUnit rules, their result wins over this list.

| Layer | Smell | What it shows |
|---|---|---|
| `web/` | a repository, an `EntityManager` or a query in a controller | gate rule 11: the controller does the service's job |
| `web/` | an `if` on a status or a role that decides what happens | gate rule 11: the rule belongs in the service or the domain |
| `web/` | an `@Entity` as a parameter or a return type | Java rule 8: the table shape is the API; a column rename breaks the clients |
| `service/` | `ResponseEntity`, `HttpStatus` or `HttpServletRequest` | gate rule 13: the service knows the transport; throw a domain error, translate it in `web/` |
| `domain/` | `jakarta.persistence`, `org.springframework` or a client import | gate rule 12: the rule cannot be tested without the framework |
| anywhere | `@Autowired` on a field | Java rule 7: the dependency is hidden from the constructor and from the test |

## Two searches

Run these on the changed files:

```bash
command grep -n "@Autowired" <changed files>                                   # field injection: Java rule 7
command grep -ln "Repository\b\|EntityManager" <changed files under web/>    # data access in a controller: gate rule 11
```

A hit in a changed file is a candidate: read it before you call it a finding. A hit in a file the
task did not change is not in scope.

## Reading the measurement

The measure parses Java with the JDK on `PATH`, through its own `javac` tree API. It needs a
JDK 17 or newer, not a JRE. Without one, it stops and says so. A project that uses newer syntax
than that JDK knows stops with a parse error: use the project's JDK.

What counts as a function: a method or a constructor with a body, and a lambda that is the initial
value of a field. A constructor is `<Class>.<init>`. A lambda inside a method belongs to that
method, and its branches count toward that method's complexity. A method of an anonymous class is
measured alone, as `<Class>.<anonymous>.<method>`. Annotations do not count toward the length, and
neither does the Javadoc above the method. A test (a file under `src/test/`, or named `*Test`, `*Tests`
or `*IT`) may have 50 lines. Lombok's generated code is not measured. `default` is not
a case; `case A, B ->` is one case.

Suppressions are counted by text: `@SuppressWarnings`, `@SuppressFBWarnings`, `NOPMD`,
`NOSONAR`, `CHECKSTYLE:OFF` and `// noinspection`.
