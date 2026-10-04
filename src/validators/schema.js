// Minimal JSON-Schema (draft-07 subset) validator: type, enum, required,
// properties, additionalProperties, items, minItems, minimum, maximum, pattern.
export function validateSchema(data, schema, path = '$', root = schema) {
  if (schema.$ref) {
    const target = schema.$ref.replace('#/', '').split('/').reduce((o, k) => o?.[k], root);
    if (!target) return [`${path}: unresolved ${schema.$ref}`];
    return validateSchema(data, target, path, root);
  }
  const errors = [];
  const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v);
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = typeOf(data);
    const ok = types.some((x) => x === t || (x === 'number' && t === 'integer'));
    if (!ok) return [`${path}: expected ${types.join('|')}, got ${t}`];
  }
  if (schema.enum && !schema.enum.includes(data)) errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }
  if (typeof data === 'string' && schema.pattern && !new RegExp(schema.pattern).test(data)) {
    errors.push(`${path}: does not match ${schema.pattern}`);
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} items`);
    if (schema.items) data.forEach((v, i) => errors.push(...validateSchema(v, schema.items, `${path}[${i}]`, root)));
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required || []) if (!(key in data)) errors.push(`${path}: missing required "${key}"`);
    const props = schema.properties || {};
    for (const [key, value] of Object.entries(data)) {
      if (props[key]) errors.push(...validateSchema(value, props[key], `${path}.${key}`, root));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${key}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validateSchema(value, schema.additionalProperties, `${path}.${key}`, root));
      }
    }
  }
  return errors;
}
