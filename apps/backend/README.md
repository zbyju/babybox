# Babybox Panel Backend [![Build Status](https://app.travis-ci.com/zbyju/babybox-panel-backend.svg?branch=main)](https://app.travis-ci.com/zbyju/babybox-panel-backend) [![Coverage Status](https://coveralls.io/repos/github/zbyju/babybox-panel-backend/badge.svg?branch=main)](https://coveralls.io/github/zbyju/babybox-panel-backend?branch=main)

This repository contains a backend server in Node.js for the Babybox Panel Frontend. This project solves several problems:

- Dealing with CORS issues when requesting data from Babybox
- TODO: Accessing camera feed

## API

The API starts with `http://IP:PORT/api/v1/`; and then there are 3 main endpoints:

- `units/` - for communicating with both engine and thermal unit

  - `actions/` - these endpoints don't follow the standard RESTful practices; they execute some action when **GET** request comes
    - `open/` - opens the front doors
    - `openServiceDoors/` - opens the service doors (mainly for reseting the babybox state)
  - `settings/` - to **PUT** settings data (as JSON `[{ index: string, value: string, unit: "engine"|"thermal"}]`; it has to be an array)

- `engine/` - for communicating with the engine unit
  - `data/` - to **GET** all the data from the unit
  - `watchdog/` - when **PUT** is received it will refresh the watchdog timer (babybox won't get blocked)
- `thermal/` - for communicating with the thermal unit
  - `data/` - to **GET** all the data from the unit
- TODO: `camera/` - for communicating with the camera

There is an example request for each of these done in _Postman_ - the exported collection is in `/src/routes/__postman__/babybox-panel.postman_collection.json`. The postman tests need both working units to work.
