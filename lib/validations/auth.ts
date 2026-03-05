import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Некорректный email').min(1, 'Email обязателен'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Минимум 2 символа').max(50, 'Максимум 50 символов'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
