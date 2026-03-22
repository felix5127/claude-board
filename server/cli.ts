#!/usr/bin/env node
// ── Claude Board CLI ──
// 启动服务器并自动打开浏览器

import { exec } from 'child_process';
import { serverReady } from './index.js';

serverReady.then((port) => {
  const url = `http://localhost:${port}`;
  const cmd =
    process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} ${url}`);
});
