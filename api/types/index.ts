export interface IApiError {
  message: string;
  code?: string;
}

export interface IApiResponse<T> {
  state: boolean;
  data?: T;
  error?: IApiError;
}
