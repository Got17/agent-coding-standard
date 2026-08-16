# API Design Standard (REST / gRPC / GraphQL)

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-API-DESIGN -->
## API Design Rules
- Define every API with a machine-checkable contract: OpenAPI 3.1, Protocol Buffers, GraphQL schema, AsyncAPI, or an equivalent project-approved schema.
- Use stable, resource-oriented naming for REST endpoints (`/api/v1/users`, `/api/v1/orders/{order_id}`) with `kebab-case` path segments and `snake_case` query parameters. Explicit operation names are reserved for RPC/GraphQL contracts.
- Enforce strict RFC 9110 HTTP method semantics: `GET`, `HEAD`, `OPTIONS` must be safe and idempotent; `PUT` and `DELETE` must be idempotent; `POST` and `PATCH` are non-idempotent by default.
- Validate all incoming request payloads at the transport boundary before invoking domain logic. Reject undeclared request fields with `400 Bad Request` to prevent OWASP API3:2023 mass-assignment and property-level authorization vulnerabilities.
- Return all API errors with the standard 5-key envelope: `code`, `message`, `details` (array of field-level errors), `timestamp` (ISO-8601 UTC), and `request_id` (correlated with W3C `traceparent`).
- Version or deprecate breaking contract changes explicitly using protocol-appropriate mechanisms such as major API versions (`/v1`, `/v2`), GraphQL `@deprecated` directives, protobuf compatibility rules, or HTTP `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers.
<!-- END AGENT-STANDARD: BACKEND-API-DESIGN -->
```

---

## Detailed Human Guide & Rationale

### 1. Contract-First Boundaries

Every production API must be governed by an authoritative, machine-checkable contract checked in CI before deployment. The implementation may be code-first or spec-first, but the resulting spec artifact must be reviewable without inspecting server code.

- **HTTP APIs**: Must publish an **OpenAPI 3.1.0** specification (`openapi.yaml`). OpenAPI 3.1 aligns directly with JSON Schema Draft 2020-12, enabling full type unions (`type: ["string", "null"]`) and advanced validation keywords.
- **gRPC APIs**: Must publish Protocol Buffers (`.proto`) schemas following Proto3 language syntax and backward-compatibility rules.
- **GraphQL APIs**: Must publish a schema document (`schema.graphql`) defining explicit query, mutation, and input types.
- **Event-Driven APIs**: Must publish an **AsyncAPI** specification (`asyncapi.yaml`) or schema registry definition for message payloads.

#### Machine-Checkable Contract Example (OpenAPI 3.1 YAML)

```yaml
openapi: 3.1.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /api/v1/users:
    post:
      summary: Create a new user account
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User account created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: Validation error or undeclared properties rejected
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'

components:
  schemas:
    CreateUserRequest:
      type: object
      unevaluatedProperties: false  # Rejects undeclared fields (OWASP API3:2023 protection)
      required:
        - email
        - full_name
      properties:
        email:
          type: string
          format: email
        full_name:
          type: string
          minLength: 1
          maxLength: 100
```

#### Protocol Buffers v3 Example

```protobuf
syntax = "proto3";

package user.v1;

option go_package = "github.com/example/user/v1;userv1";

service UserService {
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
  rpc GetUser (GetUserRequest) returns (UserResponse);
}

message CreateUserRequest {
  string email = 1;
  string full_name = 2;
}

message UserResponse {
  string id = 1;
  string email = 2;
  string full_name = 3;
  string created_at = 4;
}
```

---

### 2. Resource Naming & HTTP Semantics (RFC 9110)

REST APIs must model stable domain resources using plural nouns and hierarchical path parameters.

#### Path & Query Parameter Casing
- **URL Paths**: Use lower `kebab-case` for multi-word paths (`/api/v1/user-profiles/{profile_id}`).
- **Query Parameters**: Use lower `snake_case` for query keys (`/api/v1/users?page_size=20&sort_by=created_at`).
- **JSON Payload Fields**: Use lower `snake_case` consistently across request and response JSON properties.

#### Resource Hierarchy vs. RPC Operation Naming

| Resource / Pattern | Good REST URI | Discouraged Action URI |
| :--- | :--- | :--- |
| **Collection** | `GET /api/v1/orders` | `GET /getOrders` |
| **Single Resource** | `GET /api/v1/orders/{order_id}` | `POST /fetchOrderDetails` |
| **Sub-resource** | `GET /api/v1/orders/{order_id}/items` | `GET /getOrderItems?orderId=123` |
| **Lifecycle Transition** | `POST /api/v1/orders/{order_id}/cancel` | `GET /cancelOrder` |

#### HTTP Method Semantics (RFC 9110)

- **`GET`**: Safe and idempotent. Used exclusively to retrieve resources. Must contain no request body.
- **`POST`**: Non-safe and non-idempotent. Used to create new sub-resources or trigger non-idempotent domain operations. Returns `201 Created` with a `Location` header on creation.
- **`PUT`**: Non-safe but idempotent. Replaces the entire target resource state with the request payload.
- **`PATCH`**: Non-safe and non-idempotent by default. Modifies an existing resource by applying partial delta updates.
- **`DELETE`**: Non-safe but idempotent. Removes the target resource. Success returns `204 No Content` or `200 OK`.

#### Pagination, Filtering & Sorting Defaults
Standardize pagination parameters across list endpoints:
- `page_size` or `limit` (integer, default: `20`, max: `100`).
- `cursor` (opaque string for cursor-based pagination) or `page` (integer 1-indexed for offset pagination).
- `sort_by` (string field name, e.g., `created_at`).
- `order` (`asc` or `desc`, default: `desc`).

---

### 3. Boundary Validation & Mass-Assignment Protection (OWASP API3:2023)

Transport handlers must validate incoming payloads **before** delegating to application use cases or domain entities. Validation failure must halt execution and return HTTP `400 Bad Request`.

#### Mass-Assignment & Property-Level Authorization (BOPLA)
OWASP API Security Top 10 2023 combines Excessive Data Exposure and Mass Assignment into **API3:2023 Broken Object Property Level Authorization**. 

To prevent clients from injecting unapproved properties (such as `is_admin: true` or `role: "superuser"`):
1. **Reject Unknown Fields**: Enable strict schema validation that rejects undeclared JSON properties (`unevaluatedProperties: false` or `additionalProperties: false` in OpenAPI 3.1; `extra = 'forbid'` in Pydantic v2).
2. **Explicit DTO Contracts**: Never bind request payloads directly into database entities or ORM models. Maintain distinct Request DTO structs.

```json
// Example 400 Bad Request response when undeclared fields are sent
{
  "code": "INVALID_ARGUMENT",
  "message": "Request payload validation failed.",
  "details": [
    {
      "field": "is_admin",
      "issue": "Undeclared property 'is_admin' is forbidden."
    }
  ],
  "timestamp": "2026-08-16T03:00:00Z",
  "request_id": "req_01JFX9A87B..."
}
```

---

### 4. Standard 5-Key Error Envelope & Diagnostics

All HTTP error responses (`4xx` and `5xx`) MUST use the standard flat 5-key JSON envelope. Do not wrap or nest under an `error` key.

#### Envelope Schema

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested user order was not found.",
  "details": [
    {
      "field": "order_id",
      "issue": "Order 'ord_999' does not exist or has been archived."
    }
  ],
  "timestamp": "2026-08-16T03:00:00Z",
  "request_id": "req_01JFX9A87B3C4D5E6F7G8H"
}
```

#### Envelope Fields Specification

1. **`code`** (`string`, required): A stable, uppercase machine-readable error string (e.g., `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`).
2. **`message`** (`string`, required): A clear, human-readable summary safe to display to clients. Must NOT leak internal stack traces, DB connection strings, or system paths.
3. **`details`** (`array`, required): An array of specific sub-error objects. Each object contains `field` (string path of the invalid parameter) and `issue` (description of the failure). If no field-level details exist, return an empty array `[]`.
4. **`timestamp`** (`string`, required): ISO-8601 formatted UTC timestamp (`YYYY-MM-DDTHH:mm:ssZ`) recorded at error creation time.
5. **`request_id`** (`string`, required): Server-generated request identifier correlated directly with W3C `traceparent` / OpenTelemetry `trace_id` for distributed tracing and log lookup.

#### Standard HTTP Status Code Mapping

| Status Code | Standard `code` | Scenario |
| :--- | :--- | :--- |
| **`400 Bad Request`** | `VALIDATION_FAILED` / `INVALID_ARGUMENT` | Malformed JSON, schema validation failure, or undeclared fields. |
| **`401 Unauthorized`** | `UNAUTHENTICATED` | Missing or invalid authentication credentials/token. |
| **`403 Forbidden`** | `PERMISSION_DENIED` | Authenticated client lacks permission for operation/tenant. |
| **`404 Not Found`** | `RESOURCE_NOT_FOUND` | Resource ID does not exist or user lacks access (preventing IDOR). |
| **`409 Conflict`** | `ALREADY_EXISTS` / `STATE_CONFLICT` | Unique key violation or invalid state transition. |
| **`429 Too Many Requests`** | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded; must include `Retry-After` header. |
| **`500 Internal Error`** | `INTERNAL_ERROR` | Unexpected server crash; details sanitized to mask secrets. |

---

### 5. API Compatibility, Versioning & Deprecation Lifecycle

Breaking contract changes (removing fields, renaming fields, changing field types, or altering security requirements) must be managed through planned lifecycle phases.

#### URL Versioning Strategy
Primary API versions live in the URL path: `/api/v1/...`, `/api/v2/...`. Major version increments (`v1` -> `v2`) are reserved exclusively for backwards-incompatible contract changes.

#### Non-Breaking Contract Additions
Prefer additive changes:
- Adding a new optional request field.
- Adding a new response field.
- Adding a new independent endpoint.

#### Explicit Deprecation Headers (RFC 9745 & RFC 8594)
When sunsetting an endpoint or resource version, the server MUST emit standardized HTTP response headers during the deprecation window prior to final removal:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: @1767225600
Sunset: Wed, 31 Dec 2026 23:59:59 GMT
Link: <https://api.example.com/docs/v2-migration>; rel="deprecation"; type="text/html"
```

- **`Deprecation` (RFC 9745)**: Indicates the endpoint is deprecated. Emits an absolute Unix timestamp (`@1767225600`) or boolean `true`.
- **`Sunset` (RFC 8594)**: Indicates the precise HTTP-date timestamp when the endpoint will be decommissioned and return `410 Gone` or `404 Not Found`.
- **`Link`**: Points clients to migration guides via `rel="deprecation"`.

---

## Evidence / References

- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0): Official OAS spec, fully aligned with JSON Schema Draft 2020-12 for full type unions, webhooks, and strict schema validation.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110): Authoritative IETF standard defining HTTP method semantics (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), safe/idempotent methods, status codes, and URI structures.
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457): Modern IETF standard succeeding RFC 7807 for machine-readable HTTP error details.
- [RFC 8594: The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594): Standardized HTTP header for communicating sunset/decommission dates for APIs.
- [RFC 9745: Deprecation HTTP Header Field](https://www.rfc-editor.org/rfc/rfc9745): Published IETF RFC standardizing the `Deprecation` HTTP response header field.
- [OWASP API Security Top 10 2023 — API3:2023](https://owasp.org/www-project-api-security/): OWASP API3:2023 Broken Object Property Level Authorization & Mass Assignment threat mitigation guidelines.
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/): Standard for `traceparent` headers and distributed request ID tracking.
- [Protocol Buffers Language Guide (v3)](https://protobuf.dev/programming-guides/proto3/): Official Google spec for Proto3 IDL and backwards compatibility rules.
- [GraphQL Specification](https://spec.graphql.org/): Authoritative GraphQL execution and schema definition standard.
