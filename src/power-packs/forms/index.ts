/**
 * Forms module for Invokers.
 * Provides comprehensive form validation, state management, and submission handling.
 */

import { InvokerManager } from '../../core';
import { registerFormCommands } from './commands';
import { enableFormValidation } from './validation';
import { enableFormState } from './state';
import { enableFormSubmission } from './submission';

/**
 * Enables the complete Forms module for Invokers.
 * This includes:
 * - Form validation with built-in rules (required, email, min/max, custom)
 * - Reactive form state management with dirty/pristine tracking
 * - Form submission handling with loading states and error handling
 * - Form-specific commands for validation and submission control
 */
export function enableForms(): void {
  // Register form-specific commands
  const manager = InvokerManager.getInstance();
  registerFormCommands(manager);

  // Enable form validation system
  enableFormValidation();

  // Enable reactive form state management
  enableFormState();

  // Enable form submission handling
  enableFormSubmission();
}