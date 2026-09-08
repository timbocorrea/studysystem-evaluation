/// <reference types="vite/client" />

declare module '*.mjs?url' {
  const src: string;
  export default src;
}

declare module 'react-dropbox-chooser';
