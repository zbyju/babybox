CALL cd ../../
CALL npm install -g pnpm@7.5.0
CALL pnpm install --frozen-lockfile
CALL node src/index.js --install
pause
