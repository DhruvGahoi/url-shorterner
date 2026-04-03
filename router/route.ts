import { Router } from "express";
import { nanoid } from "nanoid";
import { pool } from "../database/db";

const router = Router();

function isValidUrl(url: string | undefined): boolean {
    try {
        if (!url) return false;
        return URL.parse(url) !== null;

    } catch (error) {
        console.log(error, 'error in valid url');
        return false;
    }
}

async function generateUniqueShortCode(): Promise<string> {
    let shortcode = nanoid(7);
    let tries = 5;
    while(tries){
        const existing = await pool.query(
            `SELECT short_code FROM urls WHERE short_code = $1`, [shortcode]
        );
        if(existing.rows.length === 0) return shortcode;
        shortcode = nanoid(7);
        tries--;
    }
    throw new Error("Failed to generate unique shortcode after 5 attempts");
}

router.post("/api/shorten", async (req, res) => {
    const url = req.body.url;
    if(!isValidUrl(url)){
        return res.status(400).json({error: "Not a valid URL"});
    }
    try {
        const shortcode = await generateUniqueShortCode();
        await pool.query(
            `INSERT INTO urls (short_code, original_url)
            VALUES ($1, $2)`, [shortcode, url]
        )
        const shortUrl = `${process.env.BASE_URL}/${shortcode}`;
        res.status(201).json({shortUrl, shortCode: shortcode, originalUrl: url});
    } catch (error) {
        console.error("POST /api/shorten error:", error);
        return res.status(500).json({error: "Failed to create short url"});
    }
})

router.get("/:code", async (req, res) => {
    try {
        const code = req.params.code;
        const result = await pool.query(
            `SELECT original_url FROM urls WHERE short_code = $1`, [code]
        )
        if(result.rows.length === 0){
            return res.status(404).json({error: "URL not found"});
        }
        res.redirect(result.rows[0].original_url);
    } catch (error) {
        console.error("GET /:code error:", error);
        return res.status(500).json({error: "Failed to get short URL"});
    }
})

export { router };