export type ModuleDefinition = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  section: 'services' | 'coming';
} & ({ status: 'available'; route: '/severance' | '/insurance' | '/work' } | { status: 'planned' });

// Local catalog metadata keeps the shell independent of module implementation.
// Available routes describe working local-source modules; native release QA remains separate.
// Each id also selects a hand-built mark in ModuleSymbol rather than a text glyph.
export const modules: readonly ModuleDefinition[] = [
  { id: 'severance', titleKey: 'hub.modules.severance.title', descriptionKey: 'hub.modules.severance.description', section: 'services', status: 'available', route: '/severance' },
  { id: 'work', titleKey: 'hub.modules.workSalary.title', descriptionKey: 'hub.modules.workSalary.description', section: 'services', status: 'available', route: '/work' },
  { id: 'insurance', titleKey: 'hub.modules.insurance.title', descriptionKey: 'hub.modules.insurance.description', section: 'services', status: 'available', route: '/insurance' },
  { id: 'exchange', titleKey: 'hub.modules.exchange.title', descriptionKey: 'hub.modules.exchange.description', section: 'services', status: 'planned' },
  { id: 'finance', titleKey: 'hub.modules.finance.title', descriptionKey: 'hub.modules.finance.description', section: 'coming', status: 'planned' },
  { id: 'information', titleKey: 'hub.modules.information.title', descriptionKey: 'hub.modules.information.description', section: 'coming', status: 'planned' },
];
