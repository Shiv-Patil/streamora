import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { CONFIG_PG } from "@/config/environment";
import * as enums from "./schema/enums";
import * as relations from "./schema/relations";
import * as streams from "./schema/streams";
import * as users from "./schema/users";

const pool = new Pool({
    ...CONFIG_PG,
});

const db = drizzle(pool, {
    schema: {
        ...enums,
        ...users,
        ...streams,
        ...relations,
    },
});

export default db;
