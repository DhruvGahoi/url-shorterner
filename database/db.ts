import { Pool } from "pg";

if(!process.env.DATABASE_URL){
    console.error("Database url is required");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})