/**
 * Form submission handling for Invokers Forms module.
 * Provides loading states, error handling, and submission orchestration.
 */

import { getStateStore } from '../state/store';
import { validateForm, ValidationResult } from './validation';
import { setFormSubmitting, setFormErrors } from './state';

export interface SubmissionOptions {
  validateBeforeSubmit?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  loadingText?: string;
  successMessage?: string;
  errorMessage?: string;
}

export interface SubmissionResult {
  success: boolean;
  data?: any;
  errors?: { [fieldName: string]: string[] };
  validationErrors?: ValidationResult[];
}

class FormSubmissionHandler {
  private submittingForms: Set<string> = new Set();
  private store = getStateStore();

  /**
   * Enable form submission handling.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForSubmittableForms();
    this.setupSubmissionListeners();
  }

  /**
   * Scan for forms with submission handling.
   */
  private scanForSubmittableForms(): void {
    const forms = document.querySelectorAll('form[data-submit-handler], form[command*="submit"]');

    forms.forEach(form => {
      // Mark form as handled by our system
      form.setAttribute('data-invoker-form', 'true');
    });
  }

  /**
   * Set up submission event listeners.
   */
  private setupSubmissionListeners(): void {
    document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
  }

  /**
   * Handle form submission.
   */
  private async handleFormSubmit(event: Event): Promise<void> {
    const form = event.target as HTMLFormElement;
    if (!form || !form.hasAttribute('data-invoker-form')) return;

    const formName = form.getAttribute('data-form-state') ||
                    form.name ||
                    form.id ||
                    `form_${Math.random().toString(36).substr(2, 9)}`;

    // Check if form is already submitting
    if (this.submittingForms.has(formName)) {
      event.preventDefault();
      return;
    }

    // Get submission options
    const options = this.parseSubmissionOptions(form);

    // Prevent default if requested
    if (options.preventDefault !== false) {
      event.preventDefault();
    }

    // Stop propagation if requested
    if (options.stopPropagation) {
      event.stopPropagation();
    }

    try {
      // Mark as submitting
      this.submittingForms.add(formName);
      setFormSubmitting(formName, true);

      // Update UI
      this.setFormLoadingState(form, true, options.loadingText);

      // Validate if requested
      if (options.validateBeforeSubmit !== false) {
        const validation = validateForm();
        if (!validation.isValid) {
          setFormErrors(formName, validation.results.reduce((acc, result) => {
            acc[result.field] = result.errors;
            return acc;
          }, {} as { [fieldName: string]: string[] }));

          throw new Error('Form validation failed');
        }
      }

      // Execute submission
      const result = await this.executeSubmission(form, formName);

      // Handle success
      this.handleSubmissionSuccess(form, formName, result, options);

    } catch (error) {
      // Handle error
      this.handleSubmissionError(form, formName, error as Error, options);

    } finally {
      // Clean up
      this.submittingForms.delete(formName);
      setFormSubmitting(formName, false);
      this.setFormLoadingState(form, false);
    }
  }

  /**
   * Parse submission options from form attributes.
   */
  private parseSubmissionOptions(form: HTMLFormElement): SubmissionOptions {
    const options: SubmissionOptions = {
      validateBeforeSubmit: true,
      preventDefault: true,
      stopPropagation: false,
      loadingText: form.getAttribute('data-loading-text') || 'Submitting...',
      successMessage: form.getAttribute('data-success-message') || 'Form submitted successfully',
      errorMessage: form.getAttribute('data-error-message') || 'An error occurred'
    };

    // Parse data attributes
    const validateAttr = form.getAttribute('data-validate-before-submit');
    if (validateAttr !== null) {
      options.validateBeforeSubmit = validateAttr !== 'false';
    }

    const preventAttr = form.getAttribute('data-prevent-default');
    if (preventAttr !== null) {
      options.preventDefault = preventAttr !== 'false';
    }

    const stopAttr = form.getAttribute('data-stop-propagation');
    if (stopAttr !== null) {
      options.stopPropagation = stopAttr === 'true';
    }

    return options;
  }

  /**
   * Execute form submission.
   */
  private async executeSubmission(form: HTMLFormElement, formName: string): Promise<SubmissionResult> {
    const submitHandler = form.getAttribute('data-submit-handler');
    const command = form.getAttribute('command');

    if (submitHandler) {
      // Custom submit handler (function name or URL)
      return await this.executeCustomHandler(form, formName, submitHandler);
    }

    if (command && command.includes('submit')) {
      // Command-based submission
      return await this.executeCommandSubmission(form, formName, command);
    }

    // Default: submit via fetch to action URL
    return await this.executeDefaultSubmission(form, formName);
  }

  /**
   * Execute custom submit handler.
   */
  private async executeCustomHandler(form: HTMLFormElement, formName: string, handler: string): Promise<SubmissionResult> {
    // Check if it's a function name
    if (typeof (window as any)[handler] === 'function') {
      const handlerFunction = (window as any)[handler];
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const result = await handlerFunction(data, formName);
      return { success: true, data: result };
    }

    // Check if it's a URL
    if (handler.startsWith('http') || handler.startsWith('/')) {
      return await this.submitToUrl(form, handler);
    }

    throw new Error(`Invalid submit handler: ${handler}`);
  }

  /**
   * Execute command-based submission.
   */
  private async executeCommandSubmission(_form: HTMLFormElement, _formName: string, command: string): Promise<SubmissionResult> {
    // This would integrate with the InvokerManager to execute submit commands
    // For now, return a mock success
    console.log(`Executing submit command: ${command} for form: ${_formName}`);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true, data: { formName: _formName, submitted: true } };
  }

  /**
   * Execute default form submission.
   */
  private async executeDefaultSubmission(form: HTMLFormElement, _formName: string): Promise<SubmissionResult> {
    const action = form.action || window.location.href;
    const method = form.method || 'POST';

    return await this.submitToUrl(form, action, method);
  }

  /**
   * Submit form data to a URL.
   */
  private async submitToUrl(form: HTMLFormElement, url: string, method: string = 'POST'): Promise<SubmissionResult> {
    const formData = new FormData(form);

    const response = await fetch(url, {
      method,
      body: method === 'GET' ? undefined : formData,
      headers: {
        // Let browser set Content-Type for FormData
      }
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let data: any = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { success: true, data };
  }

  /**
   * Handle successful submission.
   */
  private handleSubmissionSuccess(
    form: HTMLFormElement,
    formName: string,
    result: SubmissionResult,
    options: SubmissionOptions
  ): void {
    // Dispatch success event
    form.dispatchEvent(new CustomEvent('form:success', {
      detail: { result, formName }
    }));

    // Show success message if configured
    if (options.successMessage) {
      this.showMessage(form, options.successMessage, 'success');
    }

    // Store result in state if needed
    if (result.data) {
      this.store.set(`forms.${formName}.lastSubmission`, result);
    }

    console.log(`Form "${formName}" submitted successfully:`, result);
  }

  /**
   * Handle submission error.
   */
  private handleSubmissionError(
    form: HTMLFormElement,
    formName: string,
    error: Error,
    options: SubmissionOptions
  ): void {
    // Dispatch error event
    form.dispatchEvent(new CustomEvent('form:error', {
      detail: { error, formName }
    }));

    // Show error message
    const message = options.errorMessage || error.message;
    this.showMessage(form, message, 'error');

    console.error(`Form "${formName}" submission failed:`, error);
  }

  /**
   * Set form loading state.
   */
  private setFormLoadingState(form: HTMLFormElement, isLoading: boolean, loadingText?: string): void {
    const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');

    submitButtons.forEach(button => {
      if (isLoading) {
        button.setAttribute('disabled', 'true');
        button.setAttribute('data-original-text', button.textContent || '');

        if (loadingText) {
          if (button.tagName === 'INPUT') {
            (button as HTMLInputElement).value = loadingText;
          } else {
            button.textContent = loadingText;
          }
        }
      } else {
        button.removeAttribute('disabled');
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
          if (button.tagName === 'INPUT') {
            (button as HTMLInputElement).value = originalText;
          } else {
            button.textContent = originalText;
          }
          button.removeAttribute('data-original-text');
        }
      }
    });

    // Add/remove loading class to form
    if (isLoading) {
      form.classList.add('submitting');
    } else {
      form.classList.remove('submitting');
    }
  }

  /**
   * Show a message to the user.
   */
  private showMessage(form: HTMLFormElement, message: string, type: 'success' | 'error'): void {
    // Look for message container
    let messageContainer = form.querySelector('.form-message') as HTMLElement;

    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.className = 'form-message';
      form.insertBefore(messageContainer, form.firstChild);
    }

    messageContainer.textContent = message;
    messageContainer.className = `form-message ${type}`;

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageContainer.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Clean up submission handling.
   */
  destroy(): void {
    document.removeEventListener('submit', this.handleFormSubmit.bind(this));
    this.submittingForms.clear();
  }
}

// Global instance
let formSubmissionHandlerInstance: FormSubmissionHandler | null = null;

export function enableFormSubmission(): void {
  if (!formSubmissionHandlerInstance) {
    formSubmissionHandlerInstance = new FormSubmissionHandler();
  }
  formSubmissionHandlerInstance.enable();
}

export function disableFormSubmission(): void {
  if (formSubmissionHandlerInstance) {
    formSubmissionHandlerInstance.destroy();
    formSubmissionHandlerInstance = null;
  }
}