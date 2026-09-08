
/**
 * Base class for all domain-related errors
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * Specifically for entities that are not found
 */
export class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity} not found with identifier: ${identifier}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Specifically for validation rules violations
 */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
