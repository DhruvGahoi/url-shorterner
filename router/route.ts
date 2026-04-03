import { Router } from "express";
import { nanoid } from "nanoid";
import { pool } from "../database/db";

const router = Router();

router.post("/api/shorten", async (req, res) => {
    const url = req.body.url;
    if(!url){
        return res.status(400).json({error: "URL is required"});
    }
    let shortcode;
    try {
        new URL(url);
        shortcode = nanoid(7);
    } catch {
        return res.status(400).json({error: "Not a valid URL"});
    }
    try {
        let tries = 5;
        while(tries){
            const existing = await pool.query(
                `SELECT short_code FROM urls WHERE short_code = $1`, [shortcode]
            );
            if(existing.rows.length === 0) break;
            shortcode = nanoid(7);
            tries--;
        }
        await pool.query(
            `INSERT INTO urls (short_code, original_url)
            VALUES ($1, $2)`, [shortcode, url]
        )
        const shortUrl = `${process.env.BASE_URL}/${shortcode}`;
        res.status(201).json({shortUrl, shortCode: shortcode, originalUrl: url});
    } catch {
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
    } catch {
        return res.status(500).json({error: "Failed to get short URL"});
    }
})

export { router };