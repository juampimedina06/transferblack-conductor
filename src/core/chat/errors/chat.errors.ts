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

export const getChatErrorText = (code: string, isTripInProgress: boolean): string => {
  if (code === 'CHAT_CLOSED' && isTripInProgress) {
    return CHAT_ERROR_MAP.CHAT_CLOSED_IN_PROGRESS;
  }
  return CHAT_ERROR_MAP[code] ?? CHAT_ERROR_MAP.UNKNOWN;
};
