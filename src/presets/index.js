import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema } from '../validators/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const signatureSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/design-signature.schema.json'), 'utf8'));

export function validateSignature(sig) {
  return validateSchema(sig, signatureSchema);
}

/** Load and schema-validate every design signature in /presets (or a custom directory). */
export function loadSignatures(dir = path.join(root, 'presets')) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const sig = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const errors = validateSignature(sig);
    if (errors.length) throw new Error(`Invalid design signature ${f}:\n${errors.join('\n')}`);
    return sig;
  });
}
