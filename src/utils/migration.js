import fs from 'fs/promises';

const isValidJid = (str) => /^\d+@s\.whatsapp\.net$/.test(str);

/**
 * Busca LID de um JID com tentativas
 */
export async function fetchLidWithRetry(ChainySock, jid, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await ChainySock.onWhatsApp(jid);
            if (result && result[0] && result[0].lid) {
                return { jid, lid: result[0].lid };
            }
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

/**
 * Atualiza o LID do dono no config.json
 */
export async function updateOwnerLid(ChainySock, numerodono, config, configPath) {
    const ownerJid = `${numerodono}@s.whatsapp.net`;
    if (!isValidJid(ownerJid)) return null;
    try {
        const result = await fetchLidWithRetry(ChainySock, ownerJid);
        if (result) {
            config.lidowner = result.lid;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
            return result.lid;
        }
    } catch (err) {
        console.error(`❌ Erro ao atualizar LID do dono: ${err.message}`);
    }
    return null;
}
