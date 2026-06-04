# P.G - E2EE Hybrid Social App

This folder is the dedicated workspace for the new web + Android app.

The parent `D:\game` folder contains a separate game project and should not be changed for this app unless explicitly requested.

## Goal

Build a web + Android app with end-to-end encryption first, then add AI agents carefully.

Core privacy rule:

> Clients own plaintext. Servers and cloud agents only see encrypted content unless the user explicitly consents.

## First MVP

1. Define the encrypted payload format and key model.
2. Build a small web prototype for encrypted notes/tasks.
3. Add backend APIs that store ciphertext only.
4. Add Android support after the encryption and sync model works.
5. Add AI agents only with clear privacy modes:
   - private on-device AI
   - metadata-only server AI
   - user-consented cloud AI

