import { z } from 'zod';

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  phone_number: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'El teléfono debe incluir código internacional (ej: +5491112345678)'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  gender: z.enum(['MASCULINO', 'FEMENINOO', 'OTRO'], {
    message: 'El género es obligatorio',
  }),
  document_type: z.enum(['DNI', 'CUIL'], {
    message: 'El tipo debe ser DNI o CUIL',
  }),
  document_number: z
    .string()
    .trim()
    .regex(/^\d{7,11}$/, 'Debe contener entre 7 y 11 dígitos sin puntos'),
  address_text: z.string().trim().min(1, 'La dirección es obligatoria').max(300),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const vehicleSchema = z.object({
  plate: z.string().trim().min(1, 'Obligatorio').max(20),
  brand: z.string().trim().min(1, 'Obligatorio').max(100),
  model: z.string().trim().min(1, 'Obligatorio').max(100),
  year: z.coerce
    .number()
    .int()
    .min(2011, 'El vehículo debe ser 2011 o más nuevo'),
  color: z.string().trim().min(1, 'Obligatorio').max(50),
  vehicleType: z.string().trim().min(1, 'Obligatorio').max(50),
  seatCount: z.coerce
    .number()
    .int()
    .min(1, 'Mínimo 1 asiento'),
  chassisNumber: z.string().trim().min(1, 'Obligatorio').max(100),
  engineNumber: z.string().trim().min(1, 'Obligatorio').max(100),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

export const documentMetadataSchema = z.object({
  documentNumber: z.string().max(100).optional().nullable(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable(),
}).refine(
  (data) => {
    if (data.issuedAt && data.expiresAt) {
      return new Date(data.expiresAt) > new Date(data.issuedAt);
    }
    return true;
  },
  {
    message: 'La fecha de vencimiento debe ser posterior a la de emisión',
    path: ['expiresAt'],
  }
);

export type DocumentMetadataFormData = z.infer<typeof documentMetadataSchema>;
