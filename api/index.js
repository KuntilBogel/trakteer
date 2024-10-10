import { configDotenv } from "dotenv";
configDotenv()
import express from "express";
import cors from 'cors'
import { Trakteer } from "./trakteer.js";

const app = express()
app.use(cors())
app.use(express.json())

app.all("/", async (req, res) => {
    res.json({ "/sendDono": "sendono", "/getSum": "Get data" })
})

app.all("/sendDono", async (req, res) => {
    try {
        let { CreatorName, UnitToDonate, Message, Display_name, Email_address } = req.query;
        if (!CreatorName) throw new Error("No creator name, set CreatorName on query ?CreatorName=<name>")
        UnitToDonate = Number(UnitToDonate)
        if (!UnitToDonate || UnitToDonate < 1) throw new Error("UnitToDonate should be a number and more than 0")
        const TR = new Trakteer()
        await TR.getData(CreatorName)
        
        res.json({...await TR.sendDono(UnitToDonate, Message, Display_name, Email_address)})
    } catch (e) {
        res.json({ error: String(e) })
    }
})

app.all("/getSum", async (req, res) => {
    try {
        const { CreatorName } = req.query;
        if (!CreatorName) throw new Error("No creator name, set CreatorName on query ?CreatorName=<name>")
        const TR = new Trakteer()
        await TR.getData(CreatorName)
        res.json(TR.CreatorData)
    } catch (e) {
        res.json({ error: String(e) })
    }
})

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

app.listen(PORT, () => {
    console.log("Trakteer API is now listening at PORT: " + PORT)
})