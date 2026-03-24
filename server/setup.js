#!/usr/bin/env node
/**
 * Скрипт инициализации проекта
 * Проверяет наличие Chrome и необходимых зависимостей
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setup() {
  log('\n🚀 Инициализация сервера конструктора вариантов ОГЭ\n', 'blue');

  // 1. Проверяем .env
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  Файл .env не найден. Создаём...', 'yellow');
    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    fs.writeFileSync(envPath, envExample);
    log('✅ Файл .env создан', 'green');
  } else {
    log('✅ Файл .env уже существует', 'green');
  }

  // 2. Проверяем node_modules
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    log('\n📦 Установка зависимостей npm...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Зависимости установлены', 'green');
  } else {
    log('✅ node_modules уже установлены', 'green');
  }

  // 3. Проверяем Chrome
  log('\n🌐 Проверка Chrome/Puppeteer...', 'blue');
  try {
    execSync('npx puppeteer browsers install chrome --progress=true', { stdio: 'inherit' });
    log('✅ Chrome установлен', 'green');
  } catch (e) {
    log('⚠️  Не удалось установить Chrome автоматически', 'yellow');
    log('Установите вручную: npx puppeteer browsers install chrome', 'yellow');
  }

  // 4. Проверяем Prisma
  log('\n🗄️  Инициализация БД...', 'blue');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    log('✅ Prisma готов', 'green');
  } catch (e) {
    log('⚠️  Ошибка Prisma:', 'yellow');
    console.error(e.message);
  }

  // 5. Итог
  log('\n✨ Инициализация завершена!', 'green');
  log('\nДля запуска используйте:', 'blue');
  log('  npm start       — режим продакшена', 'reset');
  log('  npm run dev     — режим разработки', 'reset');
  log('\n');
}

setup().catch(err => {
  log('\n❌ Ошибка при инициализации:', 'red');
  console.error(err);
  process.exit(1);
});
