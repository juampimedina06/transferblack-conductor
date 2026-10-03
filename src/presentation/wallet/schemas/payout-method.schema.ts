import { z } from 'zod';

export const payoutMethodSchema = z.object({
  account_type: z.enum(['CBU', 'CVU'], {
    message: 'Selecciona CBU o CVU',
  }),
  cbu_cvu: z
    .string()
    .trim()
    .regex(/^\d{22}$/, {
      message: 'El CBU o CVU debe tener exactamente 22 dígitos numéricos',
    }),
  alias: z
    .string()
    .trim()
    .min(6, { message: 'El Alias debe tener al menos 6 caracteres' })
    .max(50, { message: 'El Alias no puede superar 50 caracteres' }),
  account_holder_name: z
    .string()
    .trim()
    .min(2, { message: 'El nombre del titular debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar 150 caracteres' }),
  account_holder_document: z
    .string()
    .trim()
    .min(6, { message: 'El CUIT o DNI debe tener al menos 6 caracteres' })
    .max(30, { message: 'El CUIT o DNI no puede superar 30 caracteres' }),
});

export type PayoutMethodFormData = z.infer<typeof payoutMethodSchema>;
