// Adjustable properties shared by every layout component, with their legal values.
export const PROPERTY_VALUES = {
  density: ['compact', 'comfortable', 'spacious'],
  alignment: ['start', 'center'],
  columns: [1, 2, 3],
  mediaPosition: ['start', 'end', 'top', 'bottom'],
  textWidth: ['narrow', 'comfortable', 'wide'],
  sectionSpacing: ['tight', 'normal', 'loose'],
  emphasis: ['low', 'medium', 'high'],
  cardTreatment: ['none', 'plain', 'outlined', 'raised', 'filled'],
  borderTreatment: ['none', 'hairline', 'strong', 'accent'],
  backgroundTreatment: ['none', 'surface', 'mode'],
  collapse: ['none', 'after-first'],
};

export const DEFAULT_PROPS = {
  density: 'comfortable',
  alignment: 'start',
  columns: 1,
  mediaPosition: 'top',
  textWidth: 'comfortable',
  sectionSpacing: 'normal',
  emphasis: 'medium',
  cardTreatment: 'plain',
  borderTreatment: 'none',
  backgroundTreatment: 'none',
  collapse: 'none',
};

export function validateProps(props) {
  const errors = [];
  for (const [k, v] of Object.entries(props)) {
    if (!(k in PROPERTY_VALUES)) errors.push(`unknown property ${k}`);
    else if (!PROPERTY_VALUES[k].includes(v)) errors.push(`${k}=${v} is not allowed`);
  }
  return errors;
}
