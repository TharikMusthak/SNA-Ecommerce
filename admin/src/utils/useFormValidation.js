import { useEffect } from "react";

const FIELD_SELECTOR = "input, select, textarea";

export function useFormValidation() {
  useEffect(() => {
    function enableJavaScriptValidation(root) {
      if (root instanceof HTMLFormElement) root.noValidate = true;
      root.querySelectorAll?.("form").forEach((form) => {
        form.noValidate = true;
      });
    }

    enableJavaScriptValidation(document);
    const formObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enableJavaScriptValidation(node);
        });
      });
    });
    formObserver.observe(document.body, { childList: true, subtree: true });

    function fieldLabel(field) {
      const explicit = field.getAttribute("aria-label");
      if (explicit) return explicit.trim();
      const label = field.labels?.[0];
      if (label) {
        const text = [...label.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join(" ")
          .trim();
        if (text) return text;
      }
      return String(field.name || "This field")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (letter) => letter.toUpperCase());
    }

    function validationMessage(field) {
      const label = fieldLabel(field);
      const validity = field.validity;
      if (validity.valueMissing) return `${label} is required.`;
      if (validity.typeMismatch) {
        return field.type === "email"
          ? `Enter a valid email address.`
          : `Enter a valid ${label.toLowerCase()}.`;
      }
      if (validity.patternMismatch) return `${label} has an invalid format.`;
      if (validity.rangeUnderflow) return `${label} must be at least ${field.min}.`;
      if (validity.rangeOverflow) return `${label} must not exceed ${field.max}.`;
      if (validity.stepMismatch) return `${label} must use a valid increment.`;
      if (validity.tooShort) return `${label} must contain at least ${field.minLength} characters.`;
      if (validity.tooLong) return `${label} must contain no more than ${field.maxLength} characters.`;
      if (validity.badInput) return `${label} must be a valid value.`;
      return field.validationMessage || `${label} is invalid.`;
    }

    function validationHost(field) {
      return field.closest("label") || field.parentElement;
    }

    function showError(field) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      const host = validationHost(field);
      field.setAttribute("aria-invalid", "true");
      if (host) {
        host.classList.add("has-validation-error");
        host.dataset.validationMessage = validationMessage(field);
      }
    }

    function clearError(field) {
      const host = validationHost(field);
      field.removeAttribute("aria-invalid");
      if (field.dataset.whitespaceInvalid === "true") {
        field.setCustomValidity("");
        delete field.dataset.whitespaceInvalid;
      }
      if (host) {
        host.classList.remove("has-validation-error");
        delete host.dataset.validationMessage;
      }
    }

    function rejectWhitespaceOnly(field) {
      if (
        field.required &&
        ["text", "search", "email", "tel", "url", "password", "textarea"].includes(field.type) &&
        field.value.length > 0 &&
        field.value.trim().length === 0
      ) {
        field.dataset.whitespaceInvalid = "true";
        field.setCustomValidity(`${fieldLabel(field)} cannot contain only spaces.`);
      }
    }

    function handleInvalid(event) {
      // Suppress the browser tooltip; the same error is rendered inline.
      event.preventDefault();
      showError(event.target);
    }

    function handleInput(event) {
      const field = event.target;
      if (!field.matches?.(FIELD_SELECTOR)) return;
      clearError(field);
      rejectWhitespaceOnly(field);
      if (!field.checkValidity()) showError(field);
    }

    function handleSubmit(event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const fields = [...form.querySelectorAll(FIELD_SELECTOR)].filter(
        (field) => !field.disabled,
      );
      fields.forEach((field) => {
        clearError(field);
        rejectWhitespaceOnly(field);
        if (!field.checkValidity()) showError(field);
      });
      const firstInvalid = fields.find((field) => !field.checkValidity());
      if (firstInvalid) {
        event.preventDefault();
        event.stopPropagation();
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      formObserver.disconnect();
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);
}
