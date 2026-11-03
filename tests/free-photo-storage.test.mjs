import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
const migrations = new URL('../drizzle/', import.meta.url);
function database() {
  const sql = new DatabaseSync(':memory:');
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort())
    sql.exec(readFileSync(new URL(name, migrations), 'utf8'));
  return sql;
}
function save(sql, id, bytes) {
  sql.exec('BEGIN');
  try {
    sql.prepare("INSERT INTO uploads(scope,id,actor,contentType,createdAt) VALUES ('test',?,'student','image/jpeg',0)").run(id);
    sql.prepare("INSERT INTO photo_blobs(scope,id,data,byteLength,createdAt) VALUES ('test',?,?,?,0)").run(id, bytes, bytes.length);
    sql.exec('COMMIT');
  } catch (error) { sql.exec('ROLLBACK'); throw error; }
}
test('quota rejection rolls back both the photo and its upload metadata', () => {
  const sql = database();
  try {
    sql.exec("UPDATE photo_budget SET maxBytes=12 WHERE id='photos'");
    save(sql, 'first', new Uint8Array(8));
    assert.throws(() => save(sql, 'second', new Uint8Array(8)), /PHOTO_STORAGE_FULL/);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM uploads').get().n, 1);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM photo_blobs').get().n, 1);
    assert.equal(sql.prepare('SELECT usedBytes FROM photo_budget').get().usedBytes, 8);
    sql.exec("DELETE FROM photo_blobs WHERE id='first'");
    assert.equal(sql.prepare('SELECT usedBytes FROM photo_budget').get().usedBytes, 0);
    save(sql, 'third', new Uint8Array(12));
    assert.equal(sql.prepare('SELECT usedBytes FROM photo_budget').get().usedBytes, 12);
  } finally { sql.close(); }
});
test('the database enforces photo size, byte accounting and immutable contents', () => {
  const sql = database();
  try {
    assert.throws(() => save(sql, 'too-large', new Uint8Array(524289)), /CHECK constraint/);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM uploads').get().n, 0);
    save(sql, 'valid', new Uint8Array([255,216,255,217]));
    assert.throws(() => sql.exec("UPDATE photo_blobs SET data=x'ff' WHERE id='valid'"), /PHOTO_BLOB_IMMUTABLE/);
    assert.equal(sql.prepare('SELECT usedBytes FROM photo_budget').get().usedBytes, 4);
  } finally { sql.close(); }
});
