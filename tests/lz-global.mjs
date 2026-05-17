/**
 * Registers global LZString before importing app codec (browser contract).
 */
import LZString from "lz-string";

globalThis.LZString = LZString;
