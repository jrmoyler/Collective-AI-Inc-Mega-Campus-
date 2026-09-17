import { defineConfig } from 'vite';
import {execFileSync} from 'node:child_process';
const revision=process.env.VERCEL_GIT_COMMIT_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=process.env.VERCEL_GIT_COMMIT_SHA?false:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
export default defineConfig({define:{__CAMPUS_BUILD__:JSON.stringify({revision,dirty})},root:'viewer',base:'./',publicDir:'../public',build:{outDir:'../dist',emptyOutDir:true,chunkSizeWarningLimit:1800},server:{host:'0.0.0.0'}});
