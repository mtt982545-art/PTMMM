export class MmApiError extends Error {
  status: number
  code: string
  details?: unknown
  retryable: boolean
  constructor(message: string, status: number, code: string, details?: unknown, retryable = false) {
    super(message)
    this.name = 'MmApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryable = retryable
  }
}
