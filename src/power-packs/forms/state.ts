/**
 * Reactive form state management for Invokers Forms module.
 * Provides dirty/pristine tracking and form-level state management.
 */

import { getStateStore } from '../state/store';

export interface FormState {
  isDirty: boolean;
  isPristine: boolean;
  isTouched: boolean;
  isUntouched: boolean;
  isValid: boolean;
  isInvalid: boolean;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submitCount: number;
  errors: { [fieldName: string]: string[] };
  values: { [fieldName: string]: any };
}

export interface FormElement {
  element: HTMLFormElement;
  fields: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  state: FormState;
  initialValues: { [fieldName: string]: any };
}

class FormStateManager {
  private forms: Map<string, FormElement> = new Map();
  private store = getStateStore();

  /**
   * Enable reactive form state management.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForForms();
    this.setupFormListeners();
    this.initializeFormStates();
  }

  /**
   * Scan for forms with state management attributes.
   */
  private scanForForms(): void {
    // Look for forms with data-form-state or all forms by default
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
      const formName = form.getAttribute('data-form-state') ||
                      form.name ||
                      form.id ||
                      `form_${Math.random().toString(36).substr(2, 9)}`;

      const fields = this.getFormFields(form);
      const initialValues = this.getInitialValues(fields);

      const formElement: FormElement = {
        element: form as HTMLFormElement,
        fields,
        state: {
          isDirty: false,
          isPristine: true,
          isTouched: false,
          isUntouched: true,
          isValid: true,
          isInvalid: false,
          isSubmitted: false,
          isSubmitting: false,
          submitCount: 0,
          errors: {},
          values: { ...initialValues }
        },
        initialValues
      };

      this.forms.set(formName, formElement);
    });
  }

  /**
   * Get all form fields for a form element.
   */
  private getFormFields(form: Element): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
    const fields: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] = [];

    // Get all form controls
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (this.isFormControl(input)) {
        fields.push(input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
      }
    });

    return fields;
  }

  /**
   * Check if element is a form control.
   */
  private isFormControl(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type;

    // Exclude submit, button, image, reset inputs
    if (tagName === 'input' && ['submit', 'button', 'image', 'reset'].includes(type)) {
      return false;
    }

    return ['input', 'textarea', 'select'].includes(tagName);
  }

  /**
   * Get initial values for form fields.
   */
  private getInitialValues(fields: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[]): { [fieldName: string]: any } {
    const values: { [fieldName: string]: any } = {};

    fields.forEach(field => {
      const fieldName = field.name || field.id;
      if (fieldName) {
        values[fieldName] = this.getFieldValue(field);
      }
    });

    return values;
  }

  /**
   * Get the current value of a form field.
   */
  private getFieldValue(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): any {
    if (field.type === 'checkbox') {
      return (field as HTMLInputElement).checked;
    }
    if (field.type === 'radio') {
      const radioGroup = document.querySelectorAll(`input[name="${field.name}"]:checked`);
      return radioGroup.length > 0 ? (radioGroup[0] as HTMLInputElement).value : null;
    }
    if (field.type === 'number' || field.type === 'range') {
      const numValue = parseFloat(field.value);
      return isNaN(numValue) ? null : numValue;
    }
    if (field.tagName === 'SELECT' && (field as HTMLSelectElement).multiple) {
      const selectElement = field as HTMLSelectElement;
      return Array.from(selectElement.selectedOptions).map(option => option.value);
    }
    return field.value;
  }

  /**
   * Set up event listeners for form state tracking.
   */
  private setupFormListeners(): void {
    this.forms.forEach((formElement, formName) => {
      const { element: form, fields } = formElement;

      // Track field changes
      fields.forEach(field => {
        field.addEventListener('input', () => {
          this.updateFieldValue(formName, field);
          this.updateFormState(formName);
        });

        field.addEventListener('change', () => {
          this.updateFieldValue(formName, field);
          this.updateFormState(formName);
        });

        field.addEventListener('blur', () => {
          formElement.state.isTouched = true;
          formElement.state.isUntouched = false;
          this.updateFormState(formName);
        });
      });

      // Track form submission
      form.addEventListener('submit', (_event) => {
        formElement.state.isSubmitted = true;
        formElement.state.submitCount++;
        formElement.state.isSubmitting = true;
        this.updateFormState(formName);

        // Let the submission handler take over
        // The submitting state will be cleared by the submission handler
      });

      // Track form reset
      form.addEventListener('reset', () => {
        this.resetForm(formName);
      });
    });
  }

  /**
   * Initialize form states in the global state store.
   */
  private initializeFormStates(): void {
    this.forms.forEach((formElement, formName) => {
      this.store.set(`forms.${formName}`, formElement.state);
    });
  }

  /**
   * Update a field's value in form state.
   */
  private updateFieldValue(formName: string, field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const formElement = this.forms.get(formName);
    if (!formElement) return;

    const fieldName = field.name || field.id;
    if (!fieldName) return;

    const value = this.getFieldValue(field);
    formElement.state.values[fieldName] = value;
  }

  /**
   * Update overall form state.
   */
  private updateFormState(formName: string): void {
    const formElement = this.forms.get(formName);
    if (!formElement) return;

    const { state } = formElement;

    // Update dirty/pristine state
    state.isDirty = this.isFormDirty(formElement);
    state.isPristine = !state.isDirty;

    // Update touched state (already handled in blur listener)

    // Update validity (this would integrate with validation system)
    // For now, assume valid unless we have validation errors
    state.isValid = Object.keys(state.errors).length === 0;
    state.isInvalid = !state.isValid;

    // Update global state store
    this.store.set(`forms.${formName}`, state);
  }

  /**
   * Check if form is dirty (has unsaved changes).
   */
  private isFormDirty(formElement: FormElement): boolean {
    const { fields, initialValues } = formElement;

    for (const field of fields) {
      const fieldName = field.name || field.id;
      if (!fieldName) continue;

      const currentValue = this.getFieldValue(field);
      const initialValue = initialValues[fieldName];

      if (currentValue !== initialValue) {
        return true;
      }
    }

    return false;
  }

  /**
   * Reset a form to its initial state.
   */
  resetForm(formName: string): void {
    const formElement = this.forms.get(formName);
    if (!formElement) return;

    const { element: form, fields, initialValues, state } = formElement;

    // Reset form element
    form.reset();

    // Reset field values
    fields.forEach(field => {
      const fieldName = field.name || field.id;
      if (fieldName && initialValues.hasOwnProperty(fieldName)) {
        if (field.type === 'checkbox') {
          (field as HTMLInputElement).checked = initialValues[fieldName];
        } else {
          field.value = initialValues[fieldName];
        }
      }
    });

    // Reset state
    state.isDirty = false;
    state.isPristine = true;
    state.isTouched = false;
    state.isUntouched = true;
    state.isSubmitted = false;
    state.isSubmitting = false;
    state.submitCount = 0;
    state.errors = {};
    state.values = { ...initialValues };

    // Update global state
    this.store.set(`forms.${formName}`, state);
  }

  /**
   * Set form submitting state.
   */
  setSubmitting(formName: string, isSubmitting: boolean): void {
    const formElement = this.forms.get(formName);
    if (!formElement) return;

    formElement.state.isSubmitting = isSubmitting;
    this.store.set(`forms.${formName}`, formElement.state);
  }

  /**
   * Set form validation errors.
   */
  setErrors(formName: string, errors: { [fieldName: string]: string[] }): void {
    const formElement = this.forms.get(formName);
    if (!formElement) return;

    formElement.state.errors = errors;
    formElement.state.isValid = Object.keys(errors).length === 0;
    formElement.state.isInvalid = !formElement.state.isValid;

    this.store.set(`forms.${formName}`, formElement.state);
  }

  /**
   * Get form state.
   */
  getFormState(formName: string): FormState | null {
    const formElement = this.forms.get(formName);
    return formElement ? formElement.state : null;
  }

  /**
   * Get all form states.
   */
  getAllFormStates(): { [formName: string]: FormState } {
    const states: { [formName: string]: FormState } = {};

    this.forms.forEach((formElement, formName) => {
      states[formName] = formElement.state;
    });

    return states;
  }

  /**
   * Clean up form state management.
   */
  destroy(): void {
    this.forms.clear();
  }
}

// Global instance
let formStateManagerInstance: FormStateManager | null = null;

export function enableFormState(): void {
  if (!formStateManagerInstance) {
    formStateManagerInstance = new FormStateManager();
  }
  formStateManagerInstance.enable();
}

export function disableFormState(): void {
  if (formStateManagerInstance) {
    formStateManagerInstance.destroy();
    formStateManagerInstance = null;
  }
}

export function getFormState(formName: string): FormState | null {
  return formStateManagerInstance?.getFormState(formName) || null;
}

export function setFormSubmitting(formName: string, isSubmitting: boolean): void {
  formStateManagerInstance?.setSubmitting(formName, isSubmitting);
}

export function setFormErrors(formName: string, errors: { [fieldName: string]: string[] }): void {
  formStateManagerInstance?.setErrors(formName, errors);
}
