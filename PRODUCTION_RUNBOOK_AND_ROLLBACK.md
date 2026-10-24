# Collections by Chandni - Production Runbook & Database Rollback Procedures

This document provides disaster recovery, database backup, restore, and safe rollback procedures for the **Collections by Chandni** luxury e-commerce platform.

---

## 1. Production Database Backup Procedure

Before deploying schema changes, migrations, or application updates, create an immutable dump of the PostgreSQL production database.

### Full Physical / Logical Backup
Execute standard PostgreSQL dump using pg_dump with custom compressed format:
```bash
# Set timestamp variable
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="./backups/chandni_prod_${BACKUP_TIMESTAMP}.dump"

# Create backups directory if not present
mkdir -p ./backups

# Execute pg_dump using the DATABASE_URL environment variable
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="${BACKUP_FILE}"

# Verify backup integrity
pg_restore --list "${BACKUP_FILE}" > /dev/null && echo "Backup verified successfully: ${BACKUP_FILE}"
```

### Table-Specific Pre-Migration Snapshot (Orders, Inventory, Refunds)
If modifying order, payment, or inventory tables, take a targeted high-priority snapshot:
```bash
pg_dump "${DATABASE_URL}" \
  --table=orders \
  --table=order_items \
  --table=product_variants \
  --table=inventory_adjustments \
  --table=shipments \
  --table=return_requests \
  --table=refunds \
  --data-only \
  --file="./backups/critical_financial_${BACKUP_TIMESTAMP}.sql"
```

---

## 2. Production Database Restore Procedure

In the event of an unrecoverable failure during deployment, execute restore using `pg_restore`:

### Full Database Restore
```bash
# 1. Terminate active connections to prevent concurrent locks
psql "${DATABASE_URL}" -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# 2. Restore from verified dump
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  --dbname="${DATABASE_URL}" \
  "./backups/chandni_prod_<TARGET_TIMESTAMP>.dump"

# 3. Verify database health check endpoint
curl -i http://localhost:3000/api/health/db
```

---

## 3. Prisma Migration Rollback Procedure

When rolling back a faulty Prisma migration:

1. **Check Migration Status**:
   ```bash
   npx prisma migrate status --schema=server/prisma/schema.prisma
   ```

2. **Revert Migration**:
   If a migration needs to be rolled back, execute the corresponding down-migration script, or restore the pre-migration database snapshot, then resolve the migration entry:
   ```bash
   # Mark the failed migration as rolled back in _prisma_migrations
   npx prisma migrate resolve --rolled-back "<MIGRATION_NAME>" --schema=server/prisma/schema.prisma
   ```

3. **Re-generate Prisma Client**:
   ```bash
   npx prisma generate --schema=server/prisma/schema.prisma
   ```

---

## 4. Connection Pooling & Resource Limits

| Component | Recommended Production Config | Purpose |
| :--- | :--- | :--- |
| `connection_limit` | 20 (or formula: `num_cpus * 2 + 1`) | Prevents exhausting Postgres server memory |
| `pool_timeout` | 10 seconds | Rejects hung queries rather than blocking threads |
| `statement_timeout`| 30000ms (30s) | Terminate runaway aggregation queries |
| `idle_in_transaction_session_timeout` | 60000ms (60s) | Prevents abandoned transaction locks |

Example Prisma connection string with pooling parameters:
```env
DATABASE_URL="postgresql://chandni_user:secret@db.host.internal:5432/chandni_db?connection_limit=20&pool_timeout=10"
```

---

## 5. Security & Secret Safeguards

- Never commit `.env` or production credentials to source repositories.
- `PAYU_KEY` and `PAYU_SALT` must be populated from environment secrets only.
- In production, payment simulation endpoints (`/api/checkout/payu/simulate`) are strictly blocked.
- All admin endpoints (`/api/admin/*`, `/api/products` mutations, `/api/categories` mutations, `/api/shipping/*`, `/api/returns/*`) require valid JWT bearer tokens with the `ADMIN` role.
- Customer endpoints strictly check patron ownership (`order.userId === req.user.id`).
