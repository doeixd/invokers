/**
 * Form validation system for Invokers Forms module.
 * Provides built-in validation rules and custom validation support.
 */

import { debugLog, debugWarn, debugError } from '../../utils';
// import { getStateStore } from '../state/store'; // Not currently used

export interface ValidationRule {
  name: string;
  validate: (value: any, params?: any) => boolean;
  message: string | ((params?: any) => string);
  params?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  field: string;
}

export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  rules: ValidationRule[];
  errors: string[];
  isDirty: boolean;
  isTouched: boolean;
}

class FormValidator {
  private fields: Map<string, FormField> = new Map();
  private customRules: Map<string, ValidationRule> = new Map();

  /**
   * Initialize the form validation system.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.registerBuiltInRules();
    this.scanForValidatableFields();
    this.setupValidationListeners();
  }

  /**
   * Register built-in validation rules.
   */
  private registerBuiltInRules(): void {
    // Required validation
    this.customRules.set('required', {
      name: 'required',
      validate: (value) => value !== null && value !== undefined && String(value).trim() !== '',
      message: 'This field is required'
    });

    // Email validation
    this.customRules.set('email', {
      name: 'email',
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(value));
      },
      message: 'Please enter a valid email address'
    });

    // Minimum length
    this.customRules.set('minlength', {
      name: 'minlength',
      validate: (value, params) => String(value).length >= (params?.length || 0),
      message: (params) => `Minimum length is ${params.length} characters`
    });

    // Maximum length
    this.customRules.set('maxlength', {
      name: 'maxlength',
      validate: (value, params) => String(value).length <= (params?.length || Infinity),
      message: (params) => `Maximum length is ${params.length} characters`
    });

    // Minimum value
    this.customRules.set('min', {
      name: 'min',
      validate: (value, params) => {
        const numValue = Number(value);
        return !isNaN(numValue) && numValue >= (params?.value || 0);
      },
      message: (params) => `Minimum value is ${params.value}`
    });

    // Maximum value
    this.customRules.set('max', {
      name: 'max',
      validate: (value, params) => {
        const numValue = Number(value);
        return !isNaN(numValue) && numValue <= (params?.value || Infinity);
      },
      message: (params) => `Maximum value is ${params.value}`
    });

    // Pattern validation
    this.customRules.set('pattern', {
      name: 'pattern',
      validate: (value, params) => {
        const regex = new RegExp(params?.pattern || '');
        return regex.test(String(value));
      },
      message: (params) => params?.message || 'Invalid format'
    });

    // URL validation
    this.customRules.set('url', {
      name: 'url',
      validate: (value) => {
        try {
          new URL(String(value));
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    });
  }

  /**
   * Scan for fields with validation attributes.
   */
  private scanForValidatableFields(): void {
    // Look for elements with data-validate or form fields with validation attributes
    const selectors = [
      '[data-validate]',
      'input[required]',
      'input[type="email"]',
      'input[minlength]',
      'input[maxlength]',
      'input[min]',
      'input[max]',
      'input[pattern]',
      'textarea[required]',
      'textarea[minlength]',
      'textarea[maxlength]',
      'select[required]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        this.registerField(element as HTMLInputElement);
      });
    });
  }

  /**
   * Register a field for validation.
   */
  private registerField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const fieldName = element.name || element.id || `field_${Math.random().toString(36).substr(2, 9)}`;

    if (this.fields.has(fieldName)) return;

    const rules = this.parseValidationRules(element);
    const field: FormField = {
      element,
      rules,
      errors: [],
      isDirty: false,
      isTouched: false
    };

    this.fields.set(fieldName, field);
  }

  /**
   * Parse validation rules from element attributes.
   */
  private parseValidationRules(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Check for data-validate attribute (JSON format)
    const dataValidate = element.getAttribute('data-validate');
    if (dataValidate) {
      try {
        const customRules = JSON.parse(dataValidate);
        Object.entries(customRules).forEach(([ruleName, ruleConfig]: [string, any]) => {
          if (this.customRules.has(ruleName)) {
            const baseRule = this.customRules.get(ruleName)!;
            rules.push({
              ...baseRule,
              params: ruleConfig,
              message: typeof ruleConfig === 'object' && ruleConfig.message ? ruleConfig.message : baseRule.message
            });
          }
        });
      } catch (error) {
        debugWarn(`[InvokerForms] Invalid data-validate format:`, dataValidate);
      }
    }

    // Check for standard HTML validation attributes
    if (element.hasAttribute('required')) {
      rules.push(this.customRules.get('required')!);
    }

    if (element.type === 'email') {
      rules.push(this.customRules.get('email')!);
    }

    const minLength = element.getAttribute('minlength');
    if (minLength) {
      rules.push({
        ...this.customRules.get('minlength')!,
        params: { length: parseInt(minLength) }
      });
    }

    const maxLength = element.getAttribute('maxlength');
    if (maxLength) {
      rules.push({
        ...this.customRules.get('maxlength')!,
        params: { length: parseInt(maxLength) }
      });
    }

    const min = element.getAttribute('min');
    if (min) {
      rules.push({
        ...this.customRules.get('min')!,
        params: { value: parseFloat(min) }
      });
    }

    const max = element.getAttribute('max');
    if (max) {
      rules.push({
        ...this.customRules.get('max')!,
        params: { value: parseFloat(max) }
      });
    }

    const pattern = element.getAttribute('pattern');
    if (pattern) {
      rules.push({
        ...this.customRules.get('pattern')!,
        params: { pattern, message: element.getAttribute('title') || 'Invalid format' }
      });
    }

    return rules;
  }

  /**
   * Set up event listeners for validation.
   */
  private setupValidationListeners(): void {
    this.fields.forEach((field, fieldName) => {
      // Validate on blur (touched)
      field.element.addEventListener('blur', () => {
        field.isTouched = true;
        this.validateField(fieldName);
        this.updateFieldUI(field);
      });

      // Mark as dirty on input
      field.element.addEventListener('input', () => {
        field.isDirty = true;
        if (field.isTouched) {
          this.validateField(fieldName);
          this.updateFieldUI(field);
        }
      });

      // Validate on change for select elements
      if (field.element.tagName === 'SELECT') {
        field.element.addEventListener('change', () => {
          field.isTouched = true;
          field.isDirty = true;
          this.validateField(fieldName);
          this.updateFieldUI(field);
        });
      }
    });
  }

  /**
   * Validate a specific field.
   */
  validateField(fieldName: string): ValidationResult {
    const field = this.fields.get(fieldName);
    if (!field) {
      return { isValid: true, errors: [], field: fieldName };
    }

    field.errors = [];

    for (const rule of field.rules) {
      const value = this.getFieldValue(field.element);
      const isValid = rule.validate(value, rule.params);

      if (!isValid) {
        const message = typeof rule.message === 'function' ? rule.message(rule.params) : rule.message;
        field.errors.push(message);
      }
    }

    return {
      isValid: field.errors.length === 0,
      errors: field.errors,
      field: fieldName
    };
  }

  /**
   * Validate all fields.
   */
  validateAll(): { isValid: boolean; results: ValidationResult[] } {
    const results: ValidationResult[] = [];

    this.fields.forEach((_, fieldName) => {
      results.push(this.validateField(fieldName));
    });

    return {
      isValid: results.every(result => result.isValid),
      results
    };
  }

  /**
   * Get the value of a form field.
   */
  private getFieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): any {
    if (element.type === 'checkbox') {
      return (element as HTMLInputElement).checked;
    }
    if (element.type === 'number' || element.type === 'range') {
      const numValue = parseFloat(element.value);
      return isNaN(numValue) ? null : numValue;
    }
    return element.value;
  }

  /**
   * Update field UI based on validation state.
   */
  private updateFieldUI(field: FormField): void {
    const element = field.element;

    // Remove existing validation classes
    element.classList.remove('valid', 'invalid', 'touched', 'dirty');

    // Add current state classes
    if (field.isTouched) element.classList.add('touched');
    if (field.isDirty) element.classList.add('dirty');

    if (field.errors.length === 0) {
      element.classList.add('valid');
    } else {
      element.classList.add('invalid');
    }

    // Update aria attributes
    element.setAttribute('aria-invalid', field.errors.length > 0 ? 'true' : 'false');

    // Update error message display
    this.updateErrorDisplay(element, field.errors);
  }

  /**
   * Update error message display for a field.
   */
  private updateErrorDisplay(element: HTMLElement, errors: string[]): void {
    // Look for associated error element
    const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const errorElement = document.querySelector(`[data-error-for="${formElement.name || element.id}"]`) as HTMLElement;

    if (errorElement) {
      if (errors.length > 0) {
        errorElement.textContent = errors[0]; // Show first error
        errorElement.style.display = 'block';
      } else {
        errorElement.style.display = 'none';
      }
    }
  }

  /**
   * Add a custom validation rule.
   */
  addCustomRule(name: string, rule: ValidationRule): void {
    this.customRules.set(name, rule);
  }

  /**
   * Remove a custom validation rule.
   */
  removeCustomRule(name: string): void {
    this.customRules.delete(name);
  }

  /**
   * Get validation state for all fields.
   */
  getValidationState(): { [fieldName: string]: ValidationResult } {
    const state: { [fieldName: string]: ValidationResult } = {};

    this.fields.forEach((_, fieldName) => {
      state[fieldName] = this.validateField(fieldName);
    });

    return state;
  }

  /**
   * Reset validation state.
   */
  resetValidation(): void {
    this.fields.forEach(field => {
      field.errors = [];
      field.isDirty = false;
      field.isTouched = false;
      this.updateFieldUI(field);
    });
  }

  /**
   * Clean up validation system.
   */
  destroy(): void {
    this.fields.clear();
    this.customRules.clear();
  }
}

// Global instance
let formValidatorInstance: FormValidator | null = null;

export function enableFormValidation(): void {
  if (!formValidatorInstance) {
    formValidatorInstance = new FormValidator();
  }
  formValidatorInstance.enable();
}

export function disableFormValidation(): void {
  if (formValidatorInstance) {
    formValidatorInstance.destroy();
    formValidatorInstance = null;
  }
}

export function validateForm(): { isValid: boolean; results: ValidationResult[] } {
  return formValidatorInstance?.validateAll() || { isValid: true, results: [] };
}

export function addValidationRule(name: string, rule: ValidationRule): void {
  formValidatorInstance?.addCustomRule(name, rule);
}
