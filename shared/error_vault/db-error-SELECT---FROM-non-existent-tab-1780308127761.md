# Error: SQLite database operation failed

## Symptoms
The SQL statement failed with the following error:
```
Error: no such table: non_existent_table_for_healing_test
    at Proxy.<anonymous> (file:///D:/Agent%20OS/agent-os/server.mjs:101:33)
    at file:///D:/Agent%20OS/agent-os/server.mjs:2107:21
    at Layer.handleRequest (D:\Agent OS\agent-os\node_modules\router\lib\layer.js:152:17)
    at next (D:\Agent OS\agent-os\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (D:\Agent OS\agent-os\node_modules\router\lib\route.js:117:3)
    at handle (D:\Agent OS\agent-os\node_modules\router\index.js:435:11)
    at Layer.handleRequest (D:\Agent OS\agent-os\node_modules\router\lib\layer.js:152:17)
    at D:\Agent OS\agent-os\node_modules\router\index.js:295:15
    at processParams (D:\Agent OS\agent-os\node_modules\router\index.js:582:12)
    at next (D:\Agent OS\agent-os\node_modules\router\index.js:291:5)
```

## Root Cause
An error was thrown during SQLite database prepare or execution.
SQL Statement:
```sql
SELECT * FROM non_existent_table_for_healing_test
```

## Solution
Inspect the SQL syntax, the schema of the database at C:\Users\Gary\AppData\Roaming\AionUi\aionui\aionui-backend.db, and make sure the table exists and the schema matches. Check for database locks.
