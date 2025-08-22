## Frontend deep-linking (DataTable)

You can control the table via URL query params:

- page: `?page=2`
- pageSize: `&pageSize=100`
- search: `&search=john`
- sortBy: `&sortBy=id|name|email|orderTotal|orderCount|createdAt`
- sortDir: `&sortDir=asc|desc`

Example:

`/` → `/?page=3&pageSize=100&search=doe&sortBy=orderTotal&sortDir=desc`

