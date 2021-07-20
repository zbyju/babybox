import useCamera from "@/composables/useCamera";
import { CameraConfig } from "@/types/main";

const cfg: CameraConfig = {
  ip: "ip",
  username: "user",
  password: "pass",
  updateDelay: 10,
  cameraType: "dahua",
};

const cfgAvtech: CameraConfig = {
  ip: "ip",
  username: "user",
  password: "pass",
  updateDelay: 10,
  cameraType: "avtech",
};

describe("useCamera composable function", () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  test("URL should be initially defined", () => {
    const result = useCamera(cfg);
    expect(result.value).toBeDefined();
  });

  test("Dahua and AvTech cameras should have different URLs", () => {
    jest.useFakeTimers();
    const dahua = useCamera(cfg);
    const avtech = useCamera(cfgAvtech);
    jest.advanceTimersByTime(cfg.updateDelay * 1.5);
    expect(dahua.value).toBeDefined();
    expect(avtech.value).toBeDefined();
    expect(dahua.value).not.toEqual(avtech.value);
  });

  test("URL should contain config credentials and ip", () => {
    jest.useFakeTimers();
    const result = useCamera(cfg);
    jest.advanceTimersByTime(cfg.updateDelay * 1.5);
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(
      expect.any(Function),
      cfg.updateDelay
    );
    expect(result.value.length).toBeGreaterThan(
      cfg.ip.length + cfg.username.length + cfg.password.length
    );
    expect(result.value).toContain(cfg.ip);
    expect(result.value).toContain(cfg.username);
    expect(result.value).toContain(cfg.password);
  });

  test("URL end with a timestamp that is now", () => {
    jest.useFakeTimers();
    const result = useCamera(cfg);
    jest.advanceTimersByTime(cfg.updateDelay * 1.5);
    // Get url and remove last / if it is there
    const url =
      result.value[result.value.length - 1] === "/"
        ? result.value.slice(0, -1)
        : result.value;
    const time: number = new Date().getTime();
    // Get the timestamp from url
    const timeUrl: number = parseInt(
      url.substr(url.length - time.toString().length)
    );
    expect(Math.abs(time - timeUrl)).toBeLessThan(cfg.updateDelay * 100);
  });

  test("URL should change with time", () => {
    jest.useFakeTimers();
    const result = useCamera(cfg);
    const NUMBER_OF_TESTS = 5;
    for (let i = 0; i < NUMBER_OF_TESTS; ++i) {
      const url = result.value;
      jest.advanceTimersByTime(10000);
      expect(result.value).not.toEqual(url);
    }
  });
});
