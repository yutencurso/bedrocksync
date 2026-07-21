#!/usr/bin/env node

import { program } from 'commander';
import chokidar from 'chokidar';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Rutas de destino
const ANDROID_MOJANG = '/sdcard/Android/data/com.mojang.minecraftpe/files/games/com.mojang';
const LOCAL_MOJANG = process.env.LOCALAPPDATA 
    ? path.join(process.env.LOCALAPPDATA, 'Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang')
    : null;

// Archivo temporal para controlar el proceso (para el comando stop)
const PID_FILE = path.join(os.tmpdir(), 'bedrocksync.pid');

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function verificarADB() {
    try {
        const devices = execSync('adb devices').toString();
        const lineas = devices.trim().split('\n');
        if (lineas.length <= 1 || lineas[1].trim() === '') {
            console.error('❌ Error: No se detecta ningún dispositivo Android conectado por ADB.');
            console.error('💡 Asegúrate de activar la "Depuración USB" en tu tablet o móvil.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error: ADB no está instalado en este sistema o no responde.');
        process.exit(1);
    }
}

function sincronizar(origen, tipo, proyecto, target) {
    if (target === 'android') {
        const destinoAndroid = `${ANDROID_MOJANG}/${tipo}/${proyecto}`;
        try {
            execSync(`adb push "${origen}/." "${destinoAndroid}"`, { stdio: 'ignore' });
            console.log(`🚀 [Android] Sincronizado con éxito en ${tipo}`);
        } catch (err) {
            console.error(`❌ Error en ADB: ${err.message}`);
        }
    } else {
        const destinoLocal = path.join(LOCAL_MOJANG, tipo, proyecto);
        try {
            fs.cpSync(origen, destinoLocal, { recursive: true });
            console.log(`💻 [Local] Sincronizado con éxito en ${tipo}`);
        } catch (err) {
            console.error(`❌ Error al copiar localmente: ${err.message}`);
        }
    }
}

// ==========================================
// CONFIGURACIÓN DE COMANDOS (COMMANDER)
// ==========================================

program
    .name('bedrocksync')
    .description('Herramienta CLI para sincronizar tus proyectos de Minecraft Bedrock en tiempo real.')
    .version('1.0.0', '-v, --version', 'Muestra la versión actual del programa');

// COMANDO: start
program
    .command('start')
    .description('Inicia la sincronización en tiempo real con Minecraft')
    .option('-t, --target <dispositivo>', 'Dispositivo de destino: "local" o "android"', 'local')
    .action((options) => {
        const target = options.target.toLowerCase();

        // Validación de compatibilidad con Minecraft Local
        if (target === 'local' && process.platform !== 'win32') {
            console.log('⚠️  El funcionamiento de Minecraft en local no está disponible en este dispositivo.');
            console.log('👉 Tip: Utiliza "bedrocksync start -t android" para sincronizar con tu tablet por USB.');
            process.exit(0);
        }

        const carpetaOrigen = process.cwd();
        const nombreProyecto = path.basename(carpetaOrigen);

        let carpetaTipo = 'development_behavior_packs';
        if (nombreProyecto.toLowerCase().includes('_rp') || nombreProyecto.toLowerCase().includes('resource')) {
            carpetaTipo = 'development_resource_packs';
        }

        if (target === 'android') {
            verificarADB();
        }

        // Guardar el identificador del proceso para poder usar 'bedrocksync stop'
        fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, target }));

        console.log(`\n===========================================`);
        console.log(`📦 Proyecto: ${nombreProyecto}`);
        console.log(`📂 Carpeta: ${carpetaTipo}`);
        console.log(`🎯 Modo: [${target.toUpperCase()}]`);
        console.log(`===========================================\n`);
        console.log('👀 Vigilando cambios... Presiona Ctrl+C o usa "bedrocksync stop" para detener.\n');

        const watcher = chokidar.watch(carpetaOrigen, {
            ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/dist/**'],
            persistent: true,
            ignoreInitial: false
        });

        watcher.on('all', () => {
            sincronizar(carpetaOrigen, carpetaTipo, nombreProyecto, target);
        });
    });

// COMANDO: stop
program
    .command('stop')
    .description('Detiene la sincronización activa')
    .option('-t, --target <dispositivo>', 'Dispositivo a detener: "local" o "android"', 'local')
    .action((options) => {
        if (fs.existsSync(PID_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
                process.kill(data.pid);
                fs.unlinkSync(PID_FILE);
                console.log(`🛑 Sincronización detenida correctamente.`);
            } catch (error) {
                console.log(`🛑 La sincronización no estaba en ejecución o ya se había cerrado.`);
                if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
            }
        } else {
            console.log('ℹ️ No hay ningún proceso de sincronización activo actualmente.');
        }
    });

program.parse(process.argv);