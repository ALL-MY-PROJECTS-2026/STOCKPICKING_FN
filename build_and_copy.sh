#!/usr/bin/env bash
# React FN 프로덕션 빌드 + 대용량 public 자산 복사.
# rollup(vite build) 이 이 환경에서 exit 127 → esbuild 직접 번들(build.mjs) 사용.
# preview(:5174)가 dist 를 잠그면 빌드 실패하니, 빌드 전 preview 를 멈출 것.
set -e
cd "$(dirname "$0")"
node build.mjs
# public/*-full.html (원본 5페이지 풀버전) + static/gen(대시보드 app.js·css) → dist
cp -f public/*-full.html dist/ 2>/dev/null || true
mkdir -p dist/static/gen && cp -f public/static/gen/* dist/static/gen/ 2>/dev/null || true
echo "build_and_copy 완료 → dist/"
