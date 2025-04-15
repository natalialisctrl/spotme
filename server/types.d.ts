declare module 'qrcode' {
  export function toDataURL(data: string, callback: (err: any, url: string) => void): void;
  export function toDataURL(data: string, options: any, callback: (err: any, url: string) => void): void;
  
  export function toString(data: string, callback: (err: any, string: string) => void): void;
  export function toString(data: string, options: any, callback: (err: any, string: string) => void): void;
  
  export function toFile(path: string, data: string, callback: (err: any) => void): void;
  export function toFile(path: string, data: string, options: any, callback: (err: any) => void): void;
  
  export function toFileStream(stream: NodeJS.WritableStream, data: string): void;
  export function toFileStream(stream: NodeJS.WritableStream, data: string, options: any): void;
}