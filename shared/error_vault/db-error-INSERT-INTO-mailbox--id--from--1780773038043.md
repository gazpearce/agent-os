# Error: SQLite database operation failed

## Symptoms
The SQL statement failed with the following error:
```
Error: table mailbox has no column named message
    at Proxy.<anonymous> (file:///D:/Agent%20OS/agent-os/server.mjs:117:33)
    at file:///D:/Agent%20OS/agent-os/server.mjs:3302:12
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
INSERT INTO mailbox (id, from_agent_id, to_agent_id, message, created_at) VALUES (?, ?, ?, ?, ?);
```

## Solution
Inspect the SQL syntax, the schema of the database at C:\Users\Gary\AppData\Roaming\AionUi\aionui\aionui-backend.db, and make sure the table exists and the schema matches. Check for database locks.
