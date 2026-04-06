export const COMMAND_TYPES = {
  WATER_PLANT_1: "water_plant_1",
  WATER_PLANT_2: "water_plant_2",
  SET_CONDITIONS: "set_conditions",
  DEVICE_RESET: "device_reset",
} as const;

export type CommandType = (typeof COMMAND_TYPES)[keyof typeof COMMAND_TYPES];

export interface ICommand {
  type: CommandType;
  payload?: Record<string, unknown>;
}

export interface ICommandDefinition {
  type: CommandType;
  label: string;
  description: string;
  dangerous: boolean;
}

export interface ISendCommandResponse {
  sent: boolean;
}
