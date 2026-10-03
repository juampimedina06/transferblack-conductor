import * as z from 'zod';

export const forgotPasswordEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El correo electrónico es requerido')
    .email('El formato del correo electrónico no es válido')
    .max(320, 'El correo electrónico es demasiado largo'),
});

export type ForgotPasswordEmailFormData = z.infer<typeof forgotPasswordEmailSchema>;

export const verifyPinSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d+$/, 'Solo números'),
});

export type VerifyPinFormData = z.infer<typeof verifyPinSchema>;

export const passwordValidationSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const resetPasswordFormSchema = z
  .object({
    password: passwordValidationSchema,
    confirmPassword: z.string().min(1, 'Confirmá tu nueva contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
