import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { CONFIG_PG } from "@/config/environment";

const pool = new Pool({
    ...CONFIG_PG,
});

const db = drizzle(pool);

export default db;
