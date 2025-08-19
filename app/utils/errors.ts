/**
 * Common error types and utilities for the application
 */

export class OrganizationCreationError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'OrganizationCreationError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}