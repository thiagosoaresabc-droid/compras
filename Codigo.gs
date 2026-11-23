/**
 * Compras Liiv — backend em Google Apps Script
 * Banco: planilha "Compras Liiv - Banco" (uma linha por pedaço de documento)
 * Fotos/PDF: pasta "Compras Liiv - Anexos" no Drive
 * Identidade: e-mail Google de quem abre o link
 */
var CHUNK = 40000;           // limite de uma célula é 50.000 caracteres
var ABA = 'db';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Compras Liiv')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ============ instalação (rode UMA vez, no editor) ============ */
function instalar() {
  var P = PropertiesService.getScriptProperties();
  var eu = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!P.getProperty('ADMINS')) P.setProperty('ADMINS', eu);
  banco_();
  pasta_();
  var n = importar_();
  Logger.log('Pronto. Administrador: ' + eu + ' | documentos importados: ' + n);
  Logger.log('Planilha: ' + SpreadsheetApp.openById(P.getProperty('SHEET_ID')).getUrl());
  return n;
}
/** Para acrescentar outro administrador: adminAdd('fulano@empresa.com') */
function adminAdd(email) {
  var P = PropertiesService.getScriptProperties();
  var l = (P.getProperty('ADMINS') || '').split(',').filter(String);
  email = String(email).toLowerCase().trim();
  if (l.indexOf(email) < 0) l.push(email);
  P.setProperty('ADMINS', l.join(','));
}

function banco_() {
  var P = PropertiesService.getScriptProperties();
  var id = P.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheetByName(ABA);
  var ss = SpreadsheetApp.create('Compras Liiv - Banco');
  var sh = ss.getSheets()[0];
  sh.setName(ABA);
  sh.getRange(1, 1, 1, 6).setValues([['path', 'parte', 'total', 'json', 'atualizado', 'por']]);
  sh.setFrozenRows(1);
  P.setProperty('SHEET_ID', ss.getId());
  P.setProperty('V', '1');
  return sh;
}
function pasta_() {
  var P = PropertiesService.getScriptProperties();
  var id = P.getProperty('FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.createFolder('Compras Liiv - Anexos');
  P.setProperty('FOLDER_ID', f.getId());
  return f;
}
function importar_() {
  var sh = banco_();
  if (sh.getLastRow() > 1) return 0;               // já tem dados: não sobrescreve
  var rows = [], n = 0, agora = new Date().toISOString();
  Object.keys(SEED).forEach(function (col) {
    Object.keys(SEED[col]).forEach(function (id) {
      rows = rows.concat(linhas_(col + '/' + id, JSON.stringify(SEED[col][id]), agora, 'importação'));
      n++;
    });
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 6).setValues(rows);
  bump_();
  return n;
}
function linhas_(path, json, agora, por) {
  var partes = [];
  for (var i = 0; i < json.length; i += CHUNK) partes.push(json.substr(i, CHUNK));
  if (!partes.length) partes.push('{}');
  return partes.map(function (p, k) { return [path, k, partes.length, p, agora, por]; });
}

/* ============ identidade e permissão ============ */
function email_() {
  var e = '';
  try { e = Session.getActiveUser().getEmail(); } catch (x) { }
  return String(e || '').toLowerCase();
}
function admins_() {
  return (PropertiesService.getScriptProperties().getProperty('ADMINS') || '')
    .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(String);
}
function lerTudo_() {
  var sh = banco_(), n = sh.getLastRow();
  var docs = {};
  if (n < 2) return docs;
  var v = sh.getRange(2, 1, n - 1, 4).getValues(), tmp = {};
  v.forEach(function (r) {
    (tmp[r[0]] = tmp[r[0]] || []).push([Number(r[1]), String(r[3])]);
  });
  Object.keys(tmp).forEach(function (p) {
    docs[p] = tmp[p].sort(function (a, b) { return a[0] - b[0]; })
      .map(function (x) { return x[1]; }).join('');
  });
  return docs;
}
function quem_(docs) {
  var email = email_();
  if (!email) throw new Error('SEM_IDENTIDADE');
  var admin = admins_().indexOf(email) >= 0;
  var papel = '';
  try {
    var pp = docs['cfg/papeis'] ? JSON.parse(docs['cfg/papeis']) : null;
    var reg = pp && pp.lista && pp.lista[email];
    if (reg && reg.papel) papel = reg.papel;
  } catch (x) { }
  var editor = admin || papel === 'admin' || papel === 'comprador' || papel === 'diretor';
  return { email: email, admin: admin || papel === 'admin', editor: editor, papel: papel };
}
function podeGravar_(q, path) {
  if (q.admin) return true;
  var col = path.split('/')[0];
  if (path === 'cfg/papeis') return false;                      // só administrador muda perfis
  if (q.papel) return col !== 'cfg' || q.editor;                // cadastrado: tudo, menos cfg (só editor)
  if (col === 'req' || col === 'est') return true;              // quem só logou
  if (path === 'acesso/' + q.email) return true;                // pede acesso para si
  return false;
}

/* ============ API chamada pelo navegador ============ */
function versao_() { return PropertiesService.getScriptProperties().getProperty('V') || '1'; }
function bump_() {
  var P = PropertiesService.getScriptProperties();
  P.setProperty('V', String(Number(P.getProperty('V') || '1') + 1));
}

/** Devolve o banco inteiro se mudou desde `desde`. */
function api_snapshot(desde) {
  var v = versao_();
  var docs = lerTudo_();
  var q = quem_(docs);
  if (desde != null && String(desde) === v) return { v: v, igual: true, eu: q };
  var out = {};
  Object.keys(docs).forEach(function (p) {
    var i = p.indexOf('/'), c = p.slice(0, i), id = p.slice(i + 1);
    (out[c] = out[c] || {})[id] = docs[p];
  });
  return { v: v, docs: out, eu: q };
}

function api_set(path, json) {
  path = String(path);
  if (!/^[a-z]+\/[^\/]+$/i.test(path)) throw new Error('PERM: caminho inválido');
  if (String(json).length > 4000000) throw new Error('PERM: documento grande demais');
  JSON.parse(json);
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var docs = lerTudo_(), q = quem_(docs);
    if (!podeGravar_(q, path)) throw new Error('PERM: sem permissão');
    removerLinhas_(path);
    var rows = linhas_(path, json, new Date().toISOString(), q.email);
    var sh = banco_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
    bump_();
    return versao_();
  } finally { lock.releaseLock(); }
}
function api_delete(path) {
  path = String(path);
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var docs = lerTudo_(), q = quem_(docs);
    if (!podeGravar_(q, path)) throw new Error('PERM: sem permissão');
    removerLinhas_(path);
    bump_();
    return versao_();
  } finally { lock.releaseLock(); }
}
function removerLinhas_(path) {
  var sh = banco_(), n = sh.getLastRow();
  if (n < 2) return;
  var col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (col[i][0] === path) sh.deleteRow(i + 2);
  }
}

/** Anexos: recebe base64, grava no Drive e devolve {id,url,contentType,sizeBytes}. */
function api_upload(nome, mime, b64) {
  var docs = lerTudo_(), q = quem_(docs);
  if (!(q.papel || q.admin)) {
    // quem só logou pode anexar em pedidos/estoque, como na regra de gravação
  }
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length > 25 * 1024 * 1024) throw new Error('PERM: arquivo acima de 25 MB');
  var blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', String(nome || 'anexo'));
  var f = pasta_().createFile(blob);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {
    try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) { }
  }
  var id = f.getId(), img = /^image\//.test(mime || '');
  return {
    id: id, contentType: mime || '', sizeBytes: bytes.length,
    url: img ? 'https://lh3.googleusercontent.com/d/' + id : 'https://drive.google.com/file/d/' + id + '/view'
  };
}
function api_unupload(id) {
  var docs = lerTudo_(), q = quem_(docs);
  if (!(q.papel || q.admin)) throw new Error('PERM: sem permissão');
  try { DriveApp.getFileById(String(id)).setTrashed(true); } catch (e) { }
  return true;
}
