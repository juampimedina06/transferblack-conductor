/**
 * Maps backend error codes to Spanish user-facing messages.
 * NEVER show the backend `message` field in the UI — always use this map.
 */
export const CHAT_ERROR_MAP: Record<string, string> = {
  VALIDATION_ERROR: 'No se pudo enviar el mensaje. Verificá el contenido.',
  BAD_REQUEST: 'Hubo un error con la solicitud.',
  UNAUTHORIZED: 'Tu sesión expiró. Volvé a ingresar.',
  FORBIDDEN: 'No tenés permiso para acceder a este chat.',
  NOT_FOUND: 'El viaje no existe o fue eliminado.',
  CURSOR_NOT_FOUND: 'No se pudo cargar el historial. Actualizando...',
  CHAT_CLOSED_IN_PROGRESS: 'El viaje ya comenzó. El chat se habilitará al finalizar.',
  CHAT_CLOSED: 'El chat está cerrado.',
  RATE_LIMIT_EXCEEDED: 'Enviaste muchos mensajes seguidos. Esperá unos segundos.',
  INTERNAL_ERROR: 'Error en el servidor. Intentá más tarde.',
  UNKNOWN: 'Ocurrió un error inesperado.',
};

export const extractChatError = (
  error: unknown,
): { code: string; message: string } => {
  const axiosError = error as any;
  const data = axiosError?.response?.data;
  const errObj = data?.error;

  const code = errObj?.code ?? data?.code ?? 'UNKNOWN';
  let rawMessage = errObj?.message ?? data?.message;

  if (Array.isArray(rawMessage)) {
    rawMessage = rawMessage.join('. ');
  }

  return {
    code: typeof code === 'string' ? code : 'UNKNOWN',
    message: typeof rawMessage === 'string' ? rawMessage : '',
  };
};

export const getChatErrorText = (
  code: string,
  isTripInProgress: boolean,
  serverMessage?: string,
): string => {
  if (code === 'CHAT_CLOSED' && isTripInProgress) {
    return CHAT_ERROR_MAP.CHAT_CLOSED_IN_PROGRESS;
  }
  if (CHAT_ERROR_MAP[code]) {
    return CHAT_ERROR_MAP[code];
  }
  if (serverMessage && serverMessage.trim().length > 0) {
    return serverMessage;
  }
  return CHAT_ERROR_MAP.UNKNOWN;
};
