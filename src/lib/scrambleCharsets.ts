export const CHARSETS = {
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  circuit: "╋┃━╸╺╻╹┏┓┗┛┣┫┳┻╬◉⬡⏣⎔⬢░▒▓█",
} as const;

export type CharsetKey = keyof typeof CHARSETS;
