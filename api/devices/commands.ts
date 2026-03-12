import { ApiClient } from '@/api/client';
import type { IApiResponse } from '@/api/types';
import type { ICommand, ICommandDefinition, ISendCommandResponse } from './types/commands';

export class CommandsApi extends ApiClient {
  async sendCommand(deviceId: string, command: ICommand): Promise<IApiResponse<ISendCommandResponse>> {
    return this.post<ISendCommandResponse>('/commands/send', { deviceId, command });
  }

  async getAvailableCommands(deviceId: string): Promise<IApiResponse<ICommandDefinition[]>> {
    return this.get<ICommandDefinition[]>('/commands/available', {
      params: { deviceId },
    });
  }
}
