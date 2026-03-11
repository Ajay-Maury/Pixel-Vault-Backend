export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Unauthorized', details) => new HttpError(401, message, details);
export const forbidden = (message = 'Forbidden', details) => new HttpError(403, message, details);
export const notFound = (message = 'Not found', details) => new HttpError(404, message, details);
export const conflict = (message, details) => new HttpError(409, message, details);
export const internalError = (message = 'Internal Server Error', details) => new HttpError(500, message, details);
