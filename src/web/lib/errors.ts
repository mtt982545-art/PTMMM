export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}
export class ValidationError extends AppError {
  constructor(message = 'Invalid input') { super(400, message); }
}
export function toHttpResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ ok: false, message: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ ok: false, message: 'Internal server error' }, { status: 500 });
}