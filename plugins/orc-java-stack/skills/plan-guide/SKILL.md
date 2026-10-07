---
name: plan-guide
description: Short Java rules for planning a change and for checking a plan. Invoked by the plan and plan-check stages of an orchestra workflow; can also be invoked by hand.
---

# Java plan guide

Use these rules when you write or check a plan for a Java project. Each rule is short on purpose.
The project's own code wins over a rule: when the project does it another way, follow the project.

## Where code lives

1. Put new code in the package of the feature it belongs to. Do not make a new top-level package
   for one class.
2. Keep the layers the project has (for example web, service, repository). A controller calls a
   service; a service never calls a controller.
3. Business rules go in plain classes that the tests can call with no framework, no database and
   no network.
4. Reuse the class that already does the job. Name it in the task's Notes.

## Shape of the change

5. No interface with one implementation, no factory for one product, no new config for a value
   that never changes.
6. A data holder with no behaviour is a `record`, unless the project uses another form for it.
7. Money and rates use `BigDecimal`, never `double` or `float`. The plan states the scale and the
   rounding mode.
8. A new library is a finding for plan-check. Use the JDK or a library the project already has.

## Tests

9. Every acceptance criterion has a unit test with a name that says the behaviour, for example
   `appliesDiscountAboveLimit`.
10. Plan a test for each edge the brief names: the limit value itself, zero, null when the input
    can be null.
11. Test classes mirror the package of the class they test.
