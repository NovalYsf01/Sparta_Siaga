export interface DailyForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum?: number;
  uvIndexMax: number;
  windSpeedMax: number;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  icon: string;
  isDay: boolean;
  time: string;
  precipitation?: number;
  floodWarning?: boolean;
}

export interface WeatherResponse {
  storeId: string;
  storeName: string;
  latitude: number;
  longitude: number;
  current: CurrentWeather;
  daily: DailyForecast[];
  lastUpdated: string;
}

