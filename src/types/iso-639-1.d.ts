declare module 'iso-639-1' {
  export function getCode(name: string): string;
  export function getName(code: string): string;
  export function getAllCodes(): string[];
  export function getAllNames(): string[];
  export function validate(code: string): boolean;
  export function getLanguages(codes: string[]): Array<{ code: string; name: string }>;
}
