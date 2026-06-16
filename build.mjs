// rollup(vite build)이 이 환경에서 native 바인딩으로 exit 127 → esbuild 로 직접 번들.
// 동작 확인된 패턴: 동적 import('esbuild') + try/catch + 명시적 process.exit
// (정적 import + 자연 종료는 esbuild 서비스 잔존으로 exit 127 전파됨).
// public/* 대용량 자산은 별도 bash cp 로 dist 에 복사(build_and_copy 참고).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const esbuild = await import("esbuild");

// FN/.env 의 BN_BASE 를 읽어 빌드에 주입(외부 BN Cloudflare URL 등). 없으면 "".
function readEnvBnBase() {
  for (const f of [".env", ".env.local"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*BN_BASE\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return "";
}
const BN_BASE = process.env.BN_BASE || readEnvBnBase() || "";

try {
  mkdirSync("dist/assets", { recursive: true });
  const result = await esbuild.build({
    entryPoints: ["src/main.jsx"],
    bundle: true,
    minify: true,
    sourcemap: false,
    format: "esm",
    jsx: "automatic",
    loader: { ".js": "jsx", ".css": "css" },
    define: {
      "process.env.NODE_ENV": '"production"',
      "__BN_BASE__": JSON.stringify(BN_BASE),
    },
    outdir: "dist/assets",
    entryNames: "app-[hash]",
    metafile: true,
    logLevel: "info",
  });
  const outs = Object.keys(result.metafile.outputs).map((p) => p.split(/[\\/]/).pop());
  const jsFile = outs.find((f) => f.endsWith(".js"));
  const cssFile = outs.find((f) => f.endsWith(".css"));
  let html = readFileSync("index.html", "utf8");
  // 상대경로(assets/...) — GitHub Pages 프로젝트 서브패스(/REPO/)에서도 동작.
  const cssLink = cssFile ? `<link rel="stylesheet" href="assets/${cssFile}" />\n    ` : "";
  html = html.replace(
    '<script type="module" src="/src/main.jsx"></script>',
    `${cssLink}<script type="module" src="assets/${jsFile}"></script>`
  );
  writeFileSync("dist/index.html", html);
  // GitHub Pages: Jekyll 처리 비활성(_ 시작 파일/폴더 보존)
  writeFileSync("dist/.nojekyll", "");
  console.log(`OK js=${jsFile} css=${cssFile}`);
  process.exit(0);
} catch (e) {
  console.error("BUILD FAILED:", e.message);
  (e.errors || []).slice(0, 10).forEach((x) =>
    console.error(" -", x.text, x.location && `${x.location.file}:${x.location.line}`)
  );
  process.exit(1);
}
