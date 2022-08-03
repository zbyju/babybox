export const checkInit = (): boolean => {
  const env = process.env;

  return (
    "PORT" in env &&
    "API_PREFIX" in env &&
    "ENGINE_UNIT_IP" in env &&
    "THERMAL_UNIT_IP" in env &&
    "DEFAULT_FETCH_TIMEOUT" in env &&
    "VERSION" in env &&
    "NODE_ENV" in env &&
    (env.NODE_ENV === "development" || env.NODE_ENV === "production")
  );
};
