#!/bin/bash
# Script para copiar el frontend de src a docs para despliegue
# y eliminar comentarios de los archivos JavaScript copiados.

SRC_DIR="$(dirname "$0")/src"
DEST_DIR="$(dirname "$0")/docs"

# --------------------------------------------------------------------------
# 1. Sincronizar src → docs
# --------------------------------------------------------------------------
mkdir -p "$DEST_DIR"
rsync -av --delete --exclude='*.swp' --exclude='*.tmp' --exclude='.*' "$SRC_DIR/" "$DEST_DIR/"
echo ""
echo "Copia completada de $SRC_DIR a $DEST_DIR."

# --------------------------------------------------------------------------
# 2. Eliminar comentarios de los archivos JavaScript
# --------------------------------------------------------------------------
if ! command -v node &> /dev/null; then
  echo "AVISO: node no encontrado, se omite el strip de comentarios JS."
  exit 0
fi

echo ""
echo "Eliminando comentarios de archivos JavaScript..."

# Generamos el stripper como fichero temporal para evitar problemas de
# escapado al pasar código JS como argumento de shell.
STRIPPER=$(mktemp /tmp/strip-comments-XXXXXX.js)
cat > "$STRIPPER" << 'EOF'
'use strict';
const fs   = require('fs');
const file = process.argv[2];
const src  = fs.readFileSync(file, 'utf8');

// Máquina de estados: recorre el fuente carácter a carácter respetando
// strings y template literals para no eliminar // o /* dentro de ellos.
let out = '';
let i   = 0;
const n = src.length;

while (i < n) {
  const c = src[i];

  // ── String con comillas simples o dobles ─────────────────────────────
  if (c === '"' || c === "'") {
    out += c; i++;
    while (i < n && src[i] !== c) {
      if (src[i] === '\\') { out += src[i++]; }  // carácter escapado
      if (i < n) { out += src[i++]; }
    }
    if (i < n) { out += src[i++]; }               // cierre de string

  // ── Template literal ─────────────────────────────────────────────────
  } else if (c === '`') {
    out += c; i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { out += src[i++]; }
      if (i < n) { out += src[i++]; }
    }
    if (i < n) { out += src[i++]; }

  // ── Comentario de línea  // … ─────────────────────────────────────
  } else if (c === '/' && i + 1 < n && src[i + 1] === '/') {
    while (i < n && src[i] !== '\n') { i++; }
    // Dejamos el salto de línea para no alterar la numeración

  // ── Comentario de bloque  /* … */ ────────────────────────────────
  } else if (c === '/' && i + 1 < n && src[i + 1] === '*') {
    i += 2;
    while (i + 1 < n && !(src[i] === '*' && src[i + 1] === '/')) { i++; }
    i += 2;   // consumir */

  } else {
    out += c; i++;
  }
}

// Eliminar líneas vacías (solo espacios/tabuladores o completamente vacías)
out = out.replace(/^[ \t]*\n/gm, '');

fs.writeFileSync(file, out);
EOF

# Procesar todos los .js bajo DEST_DIR
count=0
total_saved=0

while IFS= read -r -d '' jsfile; do
  before=$(wc -c < "$jsfile")
  node "$STRIPPER" "$jsfile"
  after=$(wc -c < "$jsfile")
  saved=$(( before - after ))
  total_saved=$(( total_saved + saved ))
  printf "  %-55s %5d → %5d bytes  (-%d)\n" "$jsfile" "$before" "$after" "$saved"
  (( count++ ))
done < <(find "$DEST_DIR" -name '*.js' -print0)

rm -f "$STRIPPER"

echo ""
echo "$count archivo(s) JS procesado(s). Ahorro total: ${total_saved} bytes."