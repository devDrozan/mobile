import { router } from 'expo-router';
import type { ModuleDefinition } from '../catalog';

export function openModule(module: ModuleDefinition) {
  if (module.status === 'available') router.navigate(module.route);
  else router.navigate({ pathname: '/coming-soon', params: { id: module.id } });
}
