import { IApiResponse } from '@/api/types';
import { IUser } from '@/types/user';

export interface IAuthPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload extends IAuthPayload {
  name: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}

export type AuthResponse = IApiResponse<IAuthResponse>;
