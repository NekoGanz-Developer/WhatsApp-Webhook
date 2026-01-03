const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const express = require("express");
const config = require('./config.json');

const app = express();
app.use(express.json());

function cleanMessage(text) {

    if (text === null || text === undefined) 
    
     return "";
    
    let str = String(text); 
    
    let cleaned = str
        .replace(/<:(\w+):\d+>/g, (match, name) => config.emojiMap[name] || "🔹")
        .replace(/\|\|/g, '')
        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold WA
        .replace(/^> /gm, '➔ ')
        .replace(/^- /gm, '• ');

    return cleaned;
}

async function startBridge() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Roblox Webhook", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (up) => {
        const { connection } = up;
        if (connection === 'open') {
            console.log("✅ Webhook WhatsApp Aktif & Anti-Crash!");
        } else if (connection === 'close') {
            console.log("Koneksi terputus, mencoba menyambung kembali...");
            startBridge();
        }
    });

    app.post("/webhook", async (req, res) => {
        const body = req.body;
        let finalMessage = "";

        if (body.content) {
            finalMessage += cleanMessage(body.content) + "\n";
        }

        if (body.embeds && body.embeds.length > 0) {
            body.embeds.forEach(embed => {
                if (embed.title) finalMessage += `\n*${cleanMessage(embed.title)}*`;
                if (embed.description) finalMessage += `\n${cleanMessage(embed.description)}`;

                if (embed.fields && embed.fields.length > 0) {
                    embed.fields.forEach(field => {
                        // Pastikan field.name dan field.value aman
                        finalMessage += `\n\n*${cleanMessage(field.name)}:*\n${cleanMessage(field.value)}`;
                    });
                }
            });
        }

        if (finalMessage.trim().length > 0) {
            try {
                await sock.sendMessage(config.WA_GROUP_ID, { text: finalMessage.trim() });
                console.log("🚀 Laporan terkirim!");
                res.status(204).send(); 
            } catch (err) {
                console.log("❌ Gagal kirim WA:", err.message);
                res.status(500).send(err.message);
            }
        } else {
            res.status(400).send("Payload Kosong");
        }
    });

    app.listen(3000, () => console.log("🌐 Server standby di Port 3000"));
}

startBridge();
