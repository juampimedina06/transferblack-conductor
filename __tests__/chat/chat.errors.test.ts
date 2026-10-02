import { extractChatError, getChatErrorText } from '@/core/chat/errors/chat.errors';

describe('extractChatError', () => {
  it('extracts code and string message from unified error envelope', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'El contenido no puede estar vacío',
          },
        },
      },
    };
    const result = extractChatError(error);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('El contenido no puede estar vacío');
  });

  it('joins array message from VALIDATION_ERROR', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: ['El contenido es requerido', 'Longitud mínima 1 carácter'],
          },
        },
      },
    };
    const result = extractChatError(error);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('El contenido es requerido. Longitud mínima 1 carácter');
  });

  it('falls back to UNKNOWN when response is missing', () => {
    const result = extractChatError(new Error('Network error'));
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('');
  });
});

describe('getChatErrorText', () => {
  it('returns in_progress message for CHAT_CLOSED when trip is in progress', () => {
    const text = getChatErrorText('CHAT_CLOSED', true);
    expect(text).toContain('ya comenzó');
  });

  it('returns generic closed message for CHAT_CLOSED when trip is NOT in progress', () => {
    const text = getChatErrorText('CHAT_CLOSED', false);
    expect(text).toContain('cerrado');
    expect(text).not.toContain('ya comenzó');
  });

  it('returns rate limit message for RATE_LIMIT_EXCEEDED', () => {
    const text = getChatErrorText('RATE_LIMIT_EXCEEDED', false);
    expect(text).toContain('mensajes');
  });

  it('returns unknown fallback for unrecognized code', () => {
    const text = getChatErrorText('TOTALLY_UNKNOWN_CODE', false);
    expect(text).toBe('Ocurrió un error inesperado.');
  });

  it('never surfaces backend error codes as user-facing text', () => {
    const codes = ['FORBIDDEN', 'NOT_FOUND', 'CURSOR_NOT_FOUND', 'INTERNAL_ERROR'];
    for (const code of codes) {
      const text = getChatErrorText(code, false);
      // The raw code itself must not appear in the output
      expect(text).not.toContain(code);
      // Must end with punctuation (properly formatted Spanish sentence)
      expect(text).toMatch(/[.!…]$/);
    }
  });
});
