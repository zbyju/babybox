const { onStartup } = require("./dist-release");

module.exports = function start(options) {
  return onStartup(
    Object.assign(
      {
        pnpm: "pnpm",
        requireConfigerBuild: true,
      },
      options || {}
    )
  );
};
