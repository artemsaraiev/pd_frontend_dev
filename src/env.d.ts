/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*?url' {
  const src: string;
  export default src;
}

declare module 'pdfjs-dist/web/pdf_viewer.mjs' {
  export const EventBus: any;
  export const PDFPageView: any;
}

declare module 'pdfjs-dist/web/pdf_viewer' {
  export const EventBus: any;
  export const PDFPageView: any;
}


