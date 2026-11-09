/// <reference types="astro/client" />

// Font-source asset imports (`...woff2?url`) resolve to the content-hashed
// build URL at build time — declared here so TS accepts the query suffix.
declare module '*?url' {
  const src: string;
  export default src;
}
