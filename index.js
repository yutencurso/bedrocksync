#!/usr/bin/env node

const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

// Obtener los argumentos de la terminal (ej: 'start', 'stop')
const argumento = process.argv[2];

// Ruta interna de Minecraft Bedrock (Windows)
const RUTA_MINECRAFT = path.join(
    process.env.LOCALAPPDATA,
    'Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang'
);

if (argumento === 'start') {
    const carpetaActual = process.cwd(); // La carpeta donde ejecutaste el comando
    const nombreProyecto = path.basename(carpetaActual);

    const DESTINO_BP = path.join(RUTA_MINECRAFT, 'development_behavior_packs', `${nombreProyecto}_BP`);
    const DESTINO_RP = path.join(RUTA_MINECRAFT, 'development_resource_packs', `${nombreProyecto}_RP`);

    console.log(`\x1b[36m%s\x1b[0m`, `🔄 [BedrockSync] Escuchando cambios en: ${nombreProyecto}...`);
    console.log(`\x1b[90m%s\x1b[0m`, `Presiona Ctrl + C para detener el sincronizador.\n`);

    // Empezar a vigilar la carpeta actual
    chokidar.watch(carpetaActual, { ignored: /(^|[\/\\])\../, ignoreInitial: false }).on('all', (event, filePath) => {
        if (event !== 'add' && event !== 'change') return;

        const rutaRelativa = path.relative(carpetaActual, filePath);
        let rutaDestino;

        // Detectar si el archivo va a BP o RP de forma inteligente
        if (rutaRelativa.startsWith('BP') || rutaRelativa.includes('behavior_pack')) {
            const subRuta = rutaRelativa.replace(/^BP[\\/]/, '');
            rutaDestino = path.join(DESTINO_BP, subRuta);
        } else if (rutaRelativa.startsWith('RP') || rutaRelativa.includes('resource_pack')) {
            const subRuta = rutaRelativa.replace(/^RP[\\/]/, '');
            rutaDestino = path.join(DESTINO_RP, subRuta);
        }

        if (rutaDestino) {
            try {
                fs.copySync(filePath, rutaDestino);
                console.log(`\x1b[32m%s\x1b[0m`, `⚡ Sincronizado: ${path.basename(filePath)} ➔ Minecraft Bedrock`);
            } catch (err) {
                console.error(`\x1b[31m%s\x1b[0m`, `Error al copiar: ${err.message}`);
            }
        }
    });

} else if (argumento === 'stop' || !argumento) {
    // Nota de diseño CLI: En las herramientas de terminal que se quedan escuchando (como esta), 
    // lo estándar y más dinámico es pararlas con 'Ctrl + C' en la misma ventana.
    // Si ejecutas "bedrocksync stop", simplemente le recordamos cómo cerrarlo o limpiamos procesos.
    console.log(`\x1b[33m%s\x1b[0m`, `Para detener el sincronizador activo, presiona 'Ctrl + C' en la terminal donde lo iniciaste.`);
} else if (process.argv[2] === '--version' || process.argv[3] === '--version') {
    console.log(`BedrockSync v1.0.0  | By Daniel Tejedor`)
} else {
    console.log(`Comando no reconocido. Usa: bedrocksync start`);
}