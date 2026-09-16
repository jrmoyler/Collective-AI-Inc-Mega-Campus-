import { defineConfig } from 'vite';
export default defineConfig({root:'viewer',base:'./',publicDir:'../public',build:{outDir:'../dist',emptyOutDir:true,chunkSizeWarningLimit:1800},server:{host:'0.0.0.0'}});
