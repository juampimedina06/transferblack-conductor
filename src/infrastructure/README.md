# Infrastructure (Adaptadores Secundarios)

## Propósito
Contiene todos los detalles técnicos y conexiones con el mundo exterior: peticiones HTTP (Axios/Fetch), almacenamiento local (AsyncStorage/SecureStore), Firebase, sockets o APIs de terceros.

## Regla de Oro
> **La infraestructura depende del Core para cumplir sus contratos (implementa los puertos), pero el Core nunca depende de la infraestructura.**

## Estructura
* **`http/`**: Cliente HTTP base compartido (instancia de Axios, base URL, interceptores de autenticación y manejo de errores globales).
* **`<feature>/`** (ej: `auth/`):
  * **`dtos/`**: Tipos que reflejan exactamente la respuesta o petición de la API externa.
  * **`mappers/`**: Funciones puras que convierten DTOs externos a Modelos del Core.
  * **`repositories/`**: Clases o funciones que implementan el Puerto del Core usando el cliente HTTP y los mappers.
