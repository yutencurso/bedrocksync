const { program } = require('commander');
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// CONFIGURACIÓN DE RUTAS
// ==========================================

// Ruta local por defecto de Minecraft Windows (PC)
const LOCAL_MOJANG = path.join(
    process.env.LOCALAPPDATA,
    'Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang'
);

// Ruta interna por defecto en dispositivos Android
const ANDROID_MOJANG = '/sdcard/Android/data/com.mojang.minecraftpe/files/games/com.mojang';

// ==========================================
// FUNCIONES AUXILIARES DE SINCRONIZACIÓN
// ==========================================

// Verifica si el móvil está conectado y ADB funciona
function verificarADB() {
    try {
        const devices = execSync('adb devices').toString();
        // Si solo devuelve la cabecera, es que no hay dispositivos listados
        const lineas = devices.trim().split('\n');
        if (lineas.length <= 1 || lineas[1].trim() === '') {
            console.error('❌ Error: No se detecta ningún dispositivo Android conectado por USB.');
            console.error('💡 Asegúrate de activar la "Depuración USB" en tu móvil.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error: ADB no está instalado en el sistema o no se encuentra en el PATH.');
        process.exit(1);
    }
}

// Envía un archivo o carpeta entera a Android usando ADB
function sincronizarAAndroid(rutaLocalAbsoluta, CarpetaDestinoTipo, nombreProyecto) {
    // Reconstruimos la ruta relativa para saber si es un archivo dentro de BP o RP
    // CarpetaDestinoTipo será 'development_behavior_packs' o 'development_resource_packs'
    const rutaDestinoAndroid = `${ANDROID_MOJANG}/${CarpetaDestinoTipo}/${nombreProyecto}`;
    
    try {
        // En Android es más fácil y seguro empujar la carpeta contenedora completa 
        // para asegurar que mantenga la estructura exacta del manifest, scripts, etc.
        execSync(`adb push "${rutaLocalAbsoluta}/." "${rutaDestinoAndroid}"`, { stdio: 'ignore' });
        console.log(`🚀 [Android] Sincronizado con éxito en ${CarpetaDestinoTipo}`);
    } catch (error) {
        console.error(`❌ Error al enviar datos a Android vía ADB: ${error.message}`);
    }
}

// Sincroniza archivos localmente en la PC
function sincronizarLocal(rutaLocalAbsoluta, CarpetaDestinoTipo, nombreProyecto) {
    const rutaDestinoLocal = path.join(LOCAL_MOJANG, CarpetaDestinoTipo, nombreProyecto);
    try {
        fs.copySync(rutaLocalAbsoluta, rutaDestinoLocal, { overwrite: true });
        console.log(`💻 [PC Local] Sincronizado con éxito en ${CarpetaDestinoTipo}`);
    } catch (error) {
        console.error(`❌ Error al copiar archivos localmente: ${error.message}`);
    }
}

// ==========================================
// LÓGICA PRINCIPAL DEL COMANDO START
// ==========================================

function iniciarWatcher(tipoDestino) {
    const carpetaOrigen = process.cwd(); // La carpeta actual desde donde ejecutas el comando
    const nombreProyecto = path.basename(carpetaOrigen);
    
    // Detectamos automáticamente si es un BP o un RP analizando el nombre de la carpeta actual
    let carpetaDestinoTipo = 'development_behavior_packs';
    if (nombreProyecto.toLowerCase().includes('_rp') || nombreProyecto.toLowerCase().includes('resource')) {
        carpetaDestinoTipo = 'development_resource_packs';
    }

    console.log(`\n==================================================`);
    console.log(`📦 Proyecto detectado: ${nombreProyecto}`);
    console.log(`📂 Tipo de asignación: ${carpetaDestinoTipo}`);
    console.log(`🎯 Destino elegido: [${tipoDestino.toUpperCase()}]`);
    console.log(`==================================================\n`);

    if (tipoDestino === 'android') {
        verificarADB();
    }

    console.log('👀 Vigilando cambios en los archivos... Presiona Ctrl+C para salir.');

    // Configuración del Watcher (Chokidar)
    const watcher = chokidar.watch(carpetaOrigen, {
        ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/dist/**'], // Ignora archivos ocultos, node_modules y dist
        persistent: true,
        ignoreInitial: false // Ejecuta una copia inicial al arrancar para asegurar que todo esté al día
    });

    // Evento que se dispara al modificar, añadir o borrar archivos
    watcher.on('all', (evento, rutaArchivo) => {
        // Evitamos bucles infinitos ignorando actualizaciones temporales propias si las hubiera
        if (rutaArchivo.includes('installer')) return;

        if (tipoDestino === 'android') {
            sincronizarAAndroid(carpetaOrigen, carpetaDestinoTipo, nombreProyecto);
        } else {
            sincronizarLocal(carpetaOrigen, carpetaDestinoTipo, nombreProyecto);
        }
    });
}

// ==========================================
// DEFINICIÓN DE COMANDOS (COMMANDER)
// ==========================================

program
    .name('bedrocksync')
    .description('Herramienta CLI para desarrolladores de Minecraft Bedrock Add-ons')
    .version('1.0.0');

program
    .command('start')
    .description('Inicia la sincronización en tiempo real del proyecto actual')
    .option('-t, --target <tipo>', 'Define el dispositivo destino: "local" (PC) o "android" (Móvil)', 'local')
    .action((options) => {
        const destino = options.target.toLowerCase();
        
        if (destino !== 'local' && destino !== 'android') {
            console.error('❌ Error: El parámetro --target solo acepta "local" o "android".');
            process.exit(1);
        }

        iniciarWatcher(destino);
    });

program.parse(process.argv);