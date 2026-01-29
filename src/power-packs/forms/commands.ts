/**
 * Form-specific commands for Invokers Forms module.
 * Provides commands for validation, submission, and form state management.
 */
import { debugLog } from '../../utils';
import { InvokerManager } from '../../core';
import { validateForm } from './validation';
import { getFormState, setFormSubmitting, setFormErrors } from './state';

const formCommands: Record<string, any> = {
  /**
   * Validate form fields.
   * Usage: --form:validate or --form:validate:form-name
   */
  '--form:validate': {
    execute: ({ params, targetElement }: any) => {
      const formName = params[0] || targetElement?.closest('form')?.getAttribute('data-form-state');
      const validation = validateForm();

      if (formName) {
        setFormErrors(formName, validation.results.reduce((acc, result) => {
          acc[result.field] = result.errors;
          return acc;
        }, {} as { [fieldName: string]: string[] }));
      }

      return validation;
    }
  },

  /**
   * Submit a form.
   * Usage: --form:submit or --form:submit:form-name
   */
  '--form:submit': {
    execute: async ({ params, targetElement }: any) => {
      const formName = params[0] || targetElement?.closest('form')?.getAttribute('data-form-state');
      const form = targetElement?.closest('form') as HTMLFormElement;

      if (!form) {
        throw new Error('No form element found for submission');
      }

      if (formName) {
        setFormSubmitting(formName, true);
      }

      try {
        // Validate before submit
        const validation = validateForm();
        if (!validation.isValid) {
          throw new Error('Form validation failed');
        }

        // Create submit event
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        // If not prevented, proceed with submission
        if (!submitEvent.defaultPrevented) {
          const formData = new FormData(form);
          const response = await fetch(form.action || window.location.href, {
            method: form.method || 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Submission failed: ${response.status}`);
          }

          return { success: true, response };
        }

        return { success: true, prevented: true };
      } finally {
        if (formName) {
          setFormSubmitting(formName, false);
        }
      }
    }
  },

  /**
   * Reset a form.
   * Usage: --form:reset or --form:reset:form-name
   */
  '--form:reset': {
    execute: ({ params, targetElement }: any) => {
      const form = targetElement?.closest('form') as HTMLFormElement;

      if (form) {
        form.reset();

        // Reset validation state
        const formName = params[0] || form.getAttribute('data-form-state');
        if (formName) {
          // This would integrate with form state management
          debugLog(`Resetting form: ${formName}`);
        }
      }

      return { success: true };
    }
  },

  /**
   * Get form state.
   * Usage: --form:state:get:form-name
   */
  '--form:state:get': {
    execute: ({ params }: any) => {
      const formName = params[0];
      if (!formName) {
        throw new Error('Form name required for --form:state:get');
      }

      return getFormState(formName);
    }
  },

  /**
   * Set form field value.
   * Usage: --form:field:set:field-name:value
   */
  '--form:field:set': {
    execute: ({ params, targetElement }: any) => {
      const fieldName = params[0];
      const value = params.slice(1).join(':'); // Allow colons in value
      const form = targetElement?.closest('form') as HTMLFormElement;

      if (!form || !fieldName) {
        throw new Error('Form and field name required for --form:field:set');
      }

      const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLInputElement;
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = value === 'true';
        } else {
          field.value = value;
        }

        // Trigger change event
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return { success: true, field: fieldName, value };
    }
  },

  /**
   * Get form field value.
   * Usage: --form:field:get:field-name
   */
  '--form:field:get': {
    execute: ({ params, targetElement }: any) => {
      const fieldName = params[0];
      const form = targetElement?.closest('form') as HTMLFormElement;

      if (!form || !fieldName) {
        throw new Error('Form and field name required for --form:field:get');
      }

      const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLInputElement;
      if (!field) {
        throw new Error(`Field "${fieldName}" not found`);
      }

      const value = field.type === 'checkbox' ? field.checked : field.value;
      return { field: fieldName, value };
    }
  },

  /**
   * Focus a form field.
   * Usage: --form:focus:field-name
   */
  '--form:focus': {
    execute: ({ params, targetElement }: any) => {
      const fieldName = params[0];
      const form = targetElement?.closest('form') as HTMLFormElement;

      if (!form || !fieldName) {
        throw new Error('Form and field name required for --form:focus');
      }

      const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLElement;
      if (field && typeof field.focus === 'function') {
        field.focus();
      }

      return { success: true, field: fieldName };
    }
  },

  /**
   * Show/hide form fields based on conditions.
   * Usage: --form:conditional:show/hide:field-name:condition
   */
  '--form:conditional:show': {
    execute: ({ params }: any) => {
      const fieldName = params[0];
      const condition = params.slice(1).join(':');

      // Simple condition evaluation
      const result = new Function(`return ${condition};`)(); // Safer than eval

      const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
      if (field) {
        (field as HTMLElement).style.display = result ? '' : 'none';
      }

      return { success: true, field: fieldName, visible: result };
    }
  },

  '--form:conditional:hide': {
    execute: ({ params }: any) => {
      const fieldName = params[0];
      const condition = params.slice(1).join(':');

      const result = new Function(`return ${condition};`)();

      const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
      if (field) {
        (field as HTMLElement).style.display = result ? 'none' : '';
      }

      return { success: true, field: fieldName, hidden: result };
    }
  }
};

export function registerFormCommands(manager: InvokerManager): void {
  for (const name in formCommands) {
    if (formCommands.hasOwnProperty(name)) {
      manager.register(name, formCommands[name]);
    }
  }
}
