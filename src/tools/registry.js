import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema } from '../validators/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const registrySchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/tool-registry.schema.json'), 'utf8'));

/**
 * Machine-readable registry of approved LayaPhi capabilities. The IterationEngine
 * may only use entries whose status is "approved". New third-party tools enter
 * only through approve(), which demands a validated record and a controlled adapter.
 */
export class ToolRegistry {
  constructor(data) {
    const errors = validateSchema(data, registrySchema);
    if (errors.length) throw new Error(`Invalid tool registry:\n${errors.join('\n')}`);
    this.version = data.version;
    this.entries = data.entries.map((e) => ({ ...e }));
    const ids = new Set();
    for (const e of this.entries) {
      if (ids.has(e.id)) throw new Error(`Duplicate registry entry: ${e.id}`);
      ids.add(e.id);
    }
  }

  static load(file = path.join(root, 'registry/capabilities.json')) {
    return new ToolRegistry(JSON.parse(fs.readFileSync(file, 'utf8')));
  }

  get(id) { return this.entries.find((e) => e.id === id); }
  isApproved(id) { return this.get(id)?.status === 'approved'; }

  query({ category, status = 'approved', id } = {}) {
    return this.entries.filter((e) => (!category || e.category === category) && (!status || e.status === status) && (!id || e.id === id));
  }

  categories() { return [...new Set(this.entries.map((e) => e.category))].sort(); }

  /** Capability ids that are required but not approved. */
  missing(ids) { return [...new Set(ids)].filter((id) => !this.isApproved(id)); }

  /**
   * Promote a scanned candidate into the registry. Requires:
   *  - a ToolScanner record that was explicitly validated (record.validation.passed === true)
   *  - a controlled LayaPhi adapter descriptor
   *  - the capability not already being provided by an approved entry
   */
  approve(record, adapter) {
    if (!record || record.execution?.allowed !== false) throw new Error('approve(): expected an unexecuted ToolScanner record');
    if (record.validation?.passed !== true) throw new Error('approve(): candidate has not passed validation');
    if (!adapter || !/^[a-z0-9-]+$/.test(adapter.id || '') || !adapter.path || !adapter.category) {
      throw new Error('approve(): a controlled adapter {id, path, category} is required');
    }
    if (this.get(adapter.id)) throw new Error(`approve(): duplicate tool ${adapter.id}`);
    const entry = {
      id: adapter.id,
      name: adapter.name || adapter.id,
      category: adapter.category,
      status: 'approved',
      description: record.purpose,
      source: 'adapter',
      license: record.license.id,
      adapter: adapter.path,
      bytes: Math.round((record.bundle?.kb || 0) * 1024),
      runtimeJs: Boolean(adapter.runtimeJs),
      upstream: record.repository,
      validatedAt: record.validation.at,
    };
    const errors = validateSchema({ version: this.version, entries: [entry] }, registrySchema);
    if (errors.length) throw new Error(`approve(): ${errors.join('; ')}`);
    this.entries.push(entry);
    return entry;
  }

  toJSON() { return { version: this.version, entries: this.entries }; }
}
