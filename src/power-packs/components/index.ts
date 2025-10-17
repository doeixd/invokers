import { enableComponentRenderer } from './renderer';
import { enableScopedStyles } from './styles';

/**
 * Enables the complete Components module for Invokers.
 * This includes:
 * - Component templates with props ({{prop.name}})
 * - Content projection via slots (<slot>, data-slot)
 * - Scoped CSS for encapsulation
 */
export function enableComponents(): void {
  enableComponentRenderer();
  enableScopedStyles();
}