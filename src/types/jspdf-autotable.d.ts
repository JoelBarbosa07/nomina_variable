declare module 'jspdf-autotable' {
  interface AutoTableOptions {
    head?: string[][];
    body?: any[][];
    startY?: number;
    styles?: any;
    headStyles?: any;
  }

  function autoTable(doc: any, options: AutoTableOptions): void;
  
  export = autoTable;
}