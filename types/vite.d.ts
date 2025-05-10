declare module "*?url" {
  const result: string;
  export default result;
}

declare module "*?raw" {
  const rawContent: string;
  export default rawContent;
}

declare module "*?sql" {
  const sqlContent: string;
  export default sqlContent;
}
