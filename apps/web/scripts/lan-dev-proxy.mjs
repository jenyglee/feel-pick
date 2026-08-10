#!/usr/bin/env node
/**
 * 폰(같은 와이파이)에서 개발 중인 웹을 열기 위한 프록시.
 *
 * 왜 필요한가
 *   Next 개발 서버는 요청의 Host가 localhost가 아니면 HMR 웹소켓을 거부한다.
 *   그러면 앱 라우터 dev 번들이 하이드레이션을 끝내지 못해 화면은 그려지는데
 *   버튼이 안 눌린다. (`next dev -H 0.0.0.0`으로도 안 풀린다 — 바인딩이 아니라
 *   Host 검사라서.)
 *
 * 무엇을 하는가
 *   공개 포트(3001)로 받아서 내부 dev 서버(3101)로 넘기면서 **Host를 localhost로
 *   바꿔친다.** Next는 localhost 요청으로 보고 HMR을 허용하고, 폰은 LAN IP로
 *   접속한다. 핫리로드가 그대로 살아있다.
 *
 * 사용: npm run dev:lan -w @feel-pick/web
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { networkInterfaces } from 'node:os';

const PUBLIC_PORT = Number(process.env.PORT ?? 3001);
const INTERNAL_PORT = Number(process.env.INTERNAL_PORT ?? 3101);
const INTERNAL_HOST = '127.0.0.1';
/** Next에게 보여줄 Host. 이 값이 localhost여야 HMR이 열린다. */
const INTERNAL_HOST_HEADER = `localhost:${INTERNAL_PORT}`;

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net_ of list ?? []) {
      if (net_.family === 'IPv4' && !net_.internal) return net_.address;
    }
  }
  return 'localhost';
}

/** dev 서버는 프록시 포트를 확보한 뒤에 띄운다(실패 시 유령 프로세스 방지). */
let dev = null;

function startDevServer() {
  dev = spawn('npx', ['next', 'dev', '-p', String(INTERNAL_PORT)], {
    stdio: 'inherit',
    env: process.env,
  });
  dev.on('exit', (code) => process.exit(code ?? 0));
}

function shutdown(code) {
  dev?.kill('SIGTERM');
  process.exit(code);
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

/**
 * Next에게 보낼 헤더로 바꾼다.
 * Host뿐 아니라 **Origin·Referer도 함께** localhost로 맞춰야 한다.
 * Next는 HMR 웹소켓과 서버 액션에서 Origin이 Host와 같은지 확인하는데,
 * Host만 바꾸면 그 검사에서 어긋나 거부당한다.
 */
function toInternalHeaders(headers) {
  const rewritten = { ...headers, host: INTERNAL_HOST_HEADER };
  for (const key of ['origin', 'referer']) {
    const value = headers[key];
    if (typeof value === 'string') {
      rewritten[key] = value.replace(
        /^(https?:\/\/)[^/]+/,
        `$1${INTERNAL_HOST_HEADER}`,
      );
    }
  }
  return rewritten;
}

/** 내부 주소로 나간 리다이렉트를 폰이 따라올 수 있는 주소로 되돌린다. */
function rewriteLocation(headers, publicHost) {
  const location = headers.location;
  if (typeof location !== 'string') return headers;
  return {
    ...headers,
    location: location.replaceAll(INTERNAL_HOST_HEADER, publicHost),
  };
}

// 2) 공개 포트에서 받아 Host만 바꿔 넘긴다.
const proxy = http.createServer((req, res) => {
  const publicHost = req.headers.host ?? `${lanAddress()}:${PUBLIC_PORT}`;
  const upstream = http.request(
    {
      host: INTERNAL_HOST,
      port: INTERNAL_PORT,
      method: req.method,
      path: req.url,
      headers: toInternalHeaders(req.headers),
    },
    (upstreamRes) => {
      res.writeHead(
        upstreamRes.statusCode ?? 502,
        rewriteLocation(upstreamRes.headers, publicHost),
      );
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('개발 서버가 아직 준비되지 않았어요. 잠시 후 새로고침하세요.');
  });
  req.pipe(upstream);
});

// 3) 웹소켓(HMR)도 같은 방식으로 — 여기가 이 프록시의 존재 이유다.
proxy.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(INTERNAL_PORT, INTERNAL_HOST, () => {
    const headers = toInternalHeaders(req.headers);
    const lines = Object.entries(headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${lines}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

proxy.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `\n  포트 ${PUBLIC_PORT}이 이미 사용 중이에요.\n` +
        `  다른 개발 서버가 떠 있는지 확인하고 종료한 뒤 다시 실행하세요.\n\n` +
        `    lsof -ti:${PUBLIC_PORT},${INTERNAL_PORT} | xargs kill\n`,
    );
  } else {
    console.error(`\n  프록시를 시작하지 못했어요: ${error.message}\n`);
  }
  shutdown(1);
});

// 프록시 포트를 먼저 잡고, 성공했을 때만 dev 서버를 띄운다.
proxy.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(
    `\n  LAN 개발 프록시 준비됨\n` +
      `  - 이 컴퓨터 : http://localhost:${PUBLIC_PORT}\n` +
      `  - 폰/앱     : http://${lanAddress()}:${PUBLIC_PORT}\n` +
      `  (내부 dev 서버: ${INTERNAL_PORT} · Host를 localhost로 바꿔 HMR 유지)\n`,
  );
  startDevServer();
});
