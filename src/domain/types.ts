export type EnemyType = 'soldier' | 'mech';

export interface Coordinates {
  x: number;
  y: number;
}

export interface Enemies {
  type: EnemyType;
  number: number;
}

export interface ScanPoint {
  coordinates: Coordinates;
  enemies: Enemies;
  allies?: number;
}

export interface RadarRequest {
  protocols: string | string[];
  scan: ScanPoint[];
}

export interface RadarResponse {
  x: number;
  y: number;
}
