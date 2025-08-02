declare module 'pdf2json' {
  interface PDFData {
    Pages: Array<{
      Texts: Array<{
        x: number;
        y: number;
        w: number;
        sw: number;
        R: Array<{
          T: string;
          S: number;
          TS: [number, number, number, number];
        }>;
      }>;
    }>;
  }

  class PDFParser {
    constructor();
    parseBuffer(buffer: Buffer): void;
    on(event: 'pdfParser_dataReady', callback: (data: PDFData) => void): void;
    on(event: 'pdfParser_dataError', callback: (error: { parserError: string }) => void): void;
  }

  export = PDFParser;
}
