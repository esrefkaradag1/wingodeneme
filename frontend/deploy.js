const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({ host: "212.87.197.65", user: "wingo", password: "5qq91q^I6", secure: false });

        console.log("Sunucuya bağlandı (PROFESYONEL STANDALONE MOD)!");

        // Temizlik: Eskileri kenara çek (hızlıca)
        const timestamp = Date.now();
        await client.rename(".next", `.next_old_${timestamp}`).catch(() => {});
        await client.rename("node_modules", `node_modules_old_${timestamp}`).catch(() => {});

        const targets = [
            // Standalone içindekiler (Kritik çekirdek)
            { local: ".next/standalone/server.js", remote: "app.js" },
            { local: ".next/standalone/package.json", remote: "package.json" },
            { local: ".next/standalone/node_modules", remote: "node_modules" },
            
            // Statik dosyalar (Görseller ve CSS)
            { local: "public", remote: "public" },
            { local: ".next/static", remote: ".next/static" },
            
            // Yapılandırma
            { local: ".env.local", remote: ".env.local" },
            { local: "next.config.js", remote: "next.config.js" }
        ];

        for (const target of targets) {
            await client.cd("/");
            const localPath = path.join(__dirname, target.local);
            console.log(`Yükleniyor: ${target.local} -> ${target.remote}`);
            
            if (fs.statSync(localPath).isDirectory()) {
                await client.uploadFromDir(localPath, target.remote);
            } else {
                await client.uploadFrom(localPath, target.remote);
            }
        }

        console.log("Tüm dosyalar başarıyla yüklendi! ✅ 🚀");
        console.log("Lütfen Plesk panelinden Node.js uygulamasını RESTART yapın.");
    } catch (err) {
        console.error("Hata:", err);
    }
    client.close();
}

deploy();
