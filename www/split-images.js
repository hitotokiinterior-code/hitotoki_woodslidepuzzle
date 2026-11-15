#!/usr/bin/env node
/**
 * split-images.js
 * index.html に base64 で埋め込まれた画像を img/ フォルダの実ファイルに切り出し、
 * index.html を軽くするスクリプト。
 *
 * 使い方（ターミナルで、リポジトリのフォルダから）:
 *   node split-images.js www/index.html
 *
 * 出力: index.html と同じ場所に「split-output」フォルダができます。
 *   split-output/index.html   … 画像を外に出した軽い index.html（layout.css の <link> も追加済み）
 *   split-output/img/         … 切り出した画像ファイル
 * 元の index.html は変更しません。
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const input = process.argv[2] || "www/index.html";
if (!fs.existsSync(input)) {
  console.error("ファイルが見つかりません: " + input);
  process.exit(1);
}

const html = fs.readFileSync(input, "utf8");
const outDir = path.join(path.dirname(input), "split-output");
const imgDir = path.join(outDir, "img");
fs.mkdirSync(imgDir, { recursive: true });

const re = /data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+\/=]+)/g;
const seen = new Map(); // ハッシュ → 保存先パス（同じ画像は1ファイルにまとめる）
let count = 0;
const report = [];

const out = html.replace(re, (match, type, b64) => {
  const hash = crypto.createHash("md5").update(b64).digest("hex");
  if (seen.has(hash)) return seen.get(hash);
  count++;
  const ext = type === "jpeg" ? "jpg" : type;
  const name = "img-" + count + "." + ext;
  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(path.join(imgDir, name), buf);
  const rel = "img/" + name;
  seen.set(hash, rel);
  report.push({ file: rel, kb: Math.round(buf.length / 1024) });
  return rel;
});

// layout.css の <link> がまだ無ければ、最初の </style> の直後に追加
let finalHtml = out;
if (!/href=["']layout\.css["']/.test(finalHtml)) {
  finalHtml = finalHtml.replace(
    "</style>",
    '</style>\n<link rel="stylesheet" href="layout.css">'
  );
}

fs.writeFileSync(path.join(outDir, "index.html"), finalHtml);

console.log("切り出した画像: " + count + " 枚");
report.forEach((r) => console.log("  " + r.file + "  (" + r.kb + " KB)"));
console.log(
  "index.html: " +
    Math.round(Buffer.byteLength(html) / 1024) +
    " KB → " +
    Math.round(Buffer.byteLength(finalHtml) / 1024) +
    " KB"
);
console.log("出力先: " + outDir);
