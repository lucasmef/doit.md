import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = path.resolve('.data', 'doit-dev.sqlite');
console.log('Using DB:', dbPath);
const db = new Database(dbPath);

// Find existing users
const users = db.prepare('SELECT id, email, name FROM users LIMIT 5').all();
console.log('Users in DB:');
console.log(JSON.stringify(users, null, 2));

let devUserId;
if (users.length > 0) {
  devUserId = users[0].id;
  console.log('Using existing dev user:', devUserId);
} else {
  // Create a new user
  devUserId = 'usr_dev_' + Math.random().toString(36).slice(2, 9);
  db.prepare('INSERT INTO users (id, email, name, emailVerified, image, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    devUserId,
    'dev@doit.md',
    'Dev User',
    new Date().toISOString(),
    '',
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('Created dev user:', devUserId);
}

// Add fake calendar data for this user
const now = new Date();
const todayDateStr = now.toISOString().split('T')[0];

const fakeItemId = 'itm_fake_' + Math.random().toString(36).slice(2, 9);
const itemTitle = 'Tarefa Fake de Desenvolvimento';

try {
  // Add item
  db.prepare('INSERT INTO items (id, userId, title, status, complexity, dueDate, createdAt, updatedAt, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    fakeItemId,
    devUserId,
    itemTitle,
    'todo',
    'task',
    todayDateStr,
    new Date().toISOString(),
    new Date().toISOString(),
    'fake_hash'
  );
  console.log('Created fake item:', fakeItemId);
} catch (e) {
  console.log('Could not insert fake item. Maybe columns differ?', e.message);
}

// We can also just log out the user id to save it
console.log('=== DEV USER ID ===');
console.log(devUserId);
