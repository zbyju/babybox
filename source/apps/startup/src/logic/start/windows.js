const { onStartup } = require("./dist-release");

module.exports = function start(options) {
  return onStartup(
    Object.assign(
      {
        pnpm: "pnpm.cmd",
        requireConfigerBuild: false,
      },
      options || {}
    )
  );
};
