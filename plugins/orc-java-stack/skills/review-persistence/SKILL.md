---
name: review-persistence
description: Reviews entities, repositories, database migrations and transaction boundaries in the changed code, then fixes them. An orchestra gate; dispatched by orchestra.
---

# Persistence review

## Scope

Changed `.java` and `.sql` files are in scope: migrations, entities, repositories, and any method
that reads or writes the database. When the change has none of them, skip.

## Rules

1. **A migration stays backward compatible.** The old version still runs during a deploy and after a
   rollback. A finding: dropping or renaming a column or table, a new NOT NULL column without a
   default, a changed column type, or an applied `V*__` file that is edited, removed, reordered, or
   whose version is reused. A drop can be intended, so a migration that is not backward compatible
   is Decide.
2. **One `CREATE INDEX CONCURRENTLY` per Flyway migration file, with `IF NOT EXISTS`.** PostgreSQL
   cannot run `CREATE INDEX CONCURRENTLY` in a transaction, so such a migration runs without one. If
   a later statement in the same file fails, the earlier ones stay applied, and the migration needs a
   manual repair. `IF NOT EXISTS` lets a retried migration pass an index that already exists.

   ```sql
   -- V220__add_order_customer_id_idx.sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS order_customer_id_idx ON orders (customer_id, id DESC);
   ```
3. **No locking DDL on an existing table.** `CREATE INDEX` without `CONCURRENTLY`, and a constraint
   added without `NOT VALID`, lock the table while they run. Use `CONCURRENTLY`, and add the
   constraint `NOT VALID` with a later `VALIDATE CONSTRAINT`. Fix.
4. **Several writes share one transaction.** A method that writes more than one row or table has one
   `@Transactional` boundary around all the writes, so a failure in the middle leaves no partial
   writes. A missing boundary is Fix: put `@Transactional` on the service method that owns the use
   case.
