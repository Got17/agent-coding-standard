# Forms, Validation & User Input Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-FORMS -->
> ## Forms & Input Validation Rules
> - Enforce schema-driven validation using type-safe libraries (Zod or Valibot) shared between client inputs and backend endpoints.
> - Link input elements to field validation messages using explicit `aria-describedby="field-error-id"` and `aria-invalid="true"` attributes.
> - Disable automatic native browser validation popups (`novalidate`) to ensure consistent custom accessible error UI across all browsers.
> - Perform instant field-level validation on blur or change, and full form-level validation on submission before sending payloads over the network.
> - Protect against double-submission by disabling submit buttons or using client-side pending states during ongoing asynchronous submission requests.
> <!-- END AGENT-STANDARD: FRONTEND-FORMS -->
> ```

---

## Detailed Human Guide & Rationale

Forms represent the primary interactive bridge between users and backend state. Poor form architecture results in data corruption, screen reader disconnection, double-submissions, and frustrating user experiences.

### 1. Schema-Driven Type-Safe Validation
- **Unified Schemas**: Define validation rules using Zod or Valibot schemas. Infer TypeScript types directly from schemas (`z.infer<typeof formSchema>`) to maintain type safety from form state to submission handler.
- **Single Source of Truth**: Share input validation schemas between frontend forms and server handlers to ensure inputs rejected by the server are caught on the client prior to network dispatch.

### 2. Accessibility Invariants & Error Linkage
- **Field Error Association**: When an input fails validation, add `aria-invalid="true"` to the input element and link the error text container via `aria-describedby="[input-id]-error"`.
- **Form Error Focus**: Upon form submit failure, move keyboard focus automatically to the first invalid input element or a prominent error summary container (`role="alert"`).
- **`novalidate` Attribute**: Always add the `novalidate` attribute to `<form>` elements when implementing custom accessible validation feedback to prevent native browser tooltips from obscuring custom UI.

### 3. Submission Lifecycle & Race Condition Defense
- **Submission Pending States**: Set form pending states during async submission (`isSubmitting`/`useFormStatus`). Disable submit buttons and display visual loading spinners.
- **Idempotency & Double Submit Prevention**: Block duplicate submissions on the client while network requests are in-flight. Pass client-generated idempotency tokens for financial or non-idempotent operations.

---

## Primary Evidence & Standards

- **W3C WAI-ARIA Form Notification Patterns**: [https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — Guidance on connecting form controls with dynamic status announcements.
- **Zod TypeScript-First Schema Validation**: [https://zod.dev/](https://zod.dev/) — Industry reference for composable, type-safe schema definitions.
- **Valibot Modular Validation Specification**: [https://valibot.dev/](https://valibot.dev/) — Light-weight, tree-shakeable schema validation specification.
- **HTML Living Standard — Forms & Input Validation**: [https://html.spec.whatwg.org/multipage/forms.html](https://html.spec.whatwg.org/multipage/forms.html) — Canonical WHATWG specification for HTML form controls and constraint validation.
